import { Injectable } from '@nestjs/common';
import { BugReport } from '@prisma/client';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import { BugReportRepository } from '@gitroom/nestjs-libraries/database/prisma/bug-reports/bug.report.repository';
import { BugTrackerProvider } from '@gitroom/nestjs-libraries/bug-reports/bug.tracker.provider';
import {
  BugReportSettingsDto,
  CreateBugReportDto,
} from '@gitroom/nestjs-libraries/dtos/bug-reports/bug.report.dto';
import {
  BRAND_NAME,
  BRAND_UPSTREAM_NAME,
} from '@gitroom/helpers/branding/branding';

export const DEFAULT_BATCH_WINDOW_MINUTES = 360;
export const DEFAULT_SHAKE_THRESHOLD = 18;

/** The event a workflow listens for to run Claude Code over a batch. */
export const BUG_BATCH_DISPATCH_EVENT = 'postpls-bug-batch';

/** How long a failed batch waits before the sweep tries it again. */
const RETRY_AFTER_MINUTES = 60;

@Injectable()
export class BugReportService {
  constructor(
    private _bugReportRepository: BugReportRepository,
    private _bugTrackerProvider: BugTrackerProvider
  ) {}

  async getSettings(orgId: string) {
    const settings = await this._bugReportRepository.getSettings(orgId);
    const pending = await this._bugReportRepository.countPending(orgId);
    const oldest = await this._bugReportRepository.getOldestPending(orgId);

    const batchWindowMinutes =
      settings?.batchWindowMinutes ?? DEFAULT_BATCH_WINDOW_MINUTES;

    return {
      shakeEnabled: settings?.shakeEnabled ?? false,
      shakeThreshold: settings?.shakeThreshold ?? DEFAULT_SHAKE_THRESHOLD,
      batchWindowMinutes,
      githubEnabled: settings?.githubEnabled ?? false,
      githubRepository:
        settings?.githubRepository ||
        this._bugTrackerProvider.defaultRepository ||
        null,
      autoFixEnabled: settings?.autoFixEnabled ?? false,
      githubConfigured: this._bugTrackerProvider.configured,
      pending,
      /** When the current batch will go out, so the UI can show a countdown. */
      nextBatchAt: oldest
        ? dayjs(oldest.createdAt).add(batchWindowMinutes, 'minute').toISOString()
        : null,
    };
  }

  updateSettings(orgId: string, body: BugReportSettingsDto) {
    return this._bugReportRepository.upsertSettings(orgId, body);
  }

  createReport(orgId: string, userId: string, body: CreateBugReportDto) {
    return this._bugReportRepository.createReport(orgId, userId, body);
  }

  getReports(orgId: string) {
    return this._bugReportRepository.getReports(orgId);
  }

  deleteReport(orgId: string, id: string) {
    return this._bugReportRepository.deleteReport(orgId, id);
  }

  /** Lets the settings screen send the current batch without waiting. */
  dispatchNow(orgId: string) {
    return this.dispatchBatch(orgId);
  }

  /**
   * Which organizations have a batch due. Driven off the oldest pending report
   * rather than a timer, so the window survives a host restart.
   */
  async getOrganizationsDueForDispatch() {
    const candidates =
      await this._bugReportRepository.getOrganizationsWithPendingReports();

    const due: string[] = [];
    for (const organizationId of candidates) {
      const settings = await this._bugReportRepository.getSettings(
        organizationId
      );

      const oldest = await this._bugReportRepository.getOldestPending(
        organizationId
      );
      if (!oldest) {
        continue;
      }

      const windowMinutes =
        settings?.batchWindowMinutes ?? DEFAULT_BATCH_WINDOW_MINUTES;

      if (
        dayjs(oldest.createdAt).add(windowMinutes, 'minute').isBefore(dayjs())
      ) {
        due.push(organizationId);
      }
    }

    return due;
  }

  /**
   * Files a batch.
   *
   * Only PostPls-scope reports become issues — an upstream Postiz bug is not
   * ours to track, so it stays in the list with a body the reporter can carry
   * to gitroomhq themselves.
   */
  async dispatchBatch(orgId: string) {
    // A previously failed batch is worth retrying, but not on every sweep.
    await this._bugReportRepository.requeueFailedBefore(
      orgId,
      dayjs().subtract(RETRY_AFTER_MINUTES, 'minute').toDate()
    );

    const settings = await this._bugReportRepository.getSettings(orgId);
    const reports = await this._bugReportRepository.getPendingReports(orgId);
    if (!reports.length) {
      return { dispatched: 0, filed: 0, skipped: 0 };
    }

    const batchId = uuidv4();
    const ours = reports.filter((report) => report.scope === 'POSTPLS');
    const upstream = reports.length - ours.length;

    await this._bugReportRepository.markDispatched(
      reports.map((report) => report.id),
      batchId
    );

    const repository =
      settings?.githubRepository || this._bugTrackerProvider.defaultRepository;

    if (
      !settings?.githubEnabled ||
      !this._bugTrackerProvider.configured ||
      !repository ||
      !ours.length
    ) {
      return { dispatched: reports.length, filed: 0, skipped: upstream };
    }

    const filed: { id: string; url: string; number: number }[] = [];
    for (const report of ours) {
      try {
        const issue = await this._bugTrackerProvider.createIssue(repository, {
          title: report.title,
          body: this.renderIssueBody(report),
          labels: ['bug', 'postpls', 'shake-report'],
        });

        await this._bugReportRepository.markFiled(report.id, issue.url);
        filed.push({ id: report.id, ...issue });
      } catch (err) {
        await this._bugReportRepository.markFailed(
          [report.id],
          err instanceof Error ? err.message : 'Could not file the issue'
        );
      }
    }

    if (settings.autoFixEnabled && filed.length) {
      try {
        await this._bugTrackerProvider.dispatch(
          repository,
          BUG_BATCH_DISPATCH_EVENT,
          {
            batchId,
            issues: filed.map((issue) => issue.number),
            urls: filed.map((issue) => issue.url),
          }
        );
      } catch (err) {
        // The issues are filed either way; a failed dispatch must not undo
        // that, so it is recorded against the batch and not retried here.
        await this._bugReportRepository.markFailed(
          filed.map((issue) => issue.id),
          err instanceof Error ? err.message : 'Could not start the fix run'
        );
      }
    }

    return { dispatched: reports.length, filed: filed.length, skipped: upstream };
  }

  private renderIssueBody(report: BugReport) {
    const diagnostics = report.diagnostics
      ? `\n\n<details><summary>Diagnostics</summary>\n\n\`\`\`json\n${report.diagnostics}\n\`\`\`\n\n</details>`
      : '';

    return [
      report.description,
      '',
      '---',
      '',
      `Reported from ${report.platform || 'unknown'}${
        report.appVersion ? ` (${report.appVersion})` : ''
      }${report.route ? ` on \`${report.route}\`` : ''}.`,
      `Scope: ${
        report.scope === 'POSTPLS' ? BRAND_NAME : BRAND_UPSTREAM_NAME
      }.`,
      diagnostics,
    ].join('\n');
  }
}
