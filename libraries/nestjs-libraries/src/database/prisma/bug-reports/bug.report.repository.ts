import { Injectable } from '@nestjs/common';
import { BugReportStatus } from '@prisma/client';
import dayjs from 'dayjs';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import {
  BugReportSettingsDto,
  CreateBugReportDto,
} from '@gitroom/nestjs-libraries/dtos/bug-reports/bug.report.dto';

@Injectable()
export class BugReportRepository {
  constructor(
    private _bugReport: PrismaRepository<'bugReport'>,
    private _bugReportSettings: PrismaRepository<'bugReportSettings'>
  ) {}

  getSettings(orgId: string) {
    return this._bugReportSettings.model.bugReportSettings.findUnique({
      where: { organizationId: orgId },
    });
  }

  upsertSettings(orgId: string, body: BugReportSettingsDto) {
    // Mapped explicitly rather than spread: the global ValidationPipe runs
    // without `whitelist`, so unknown keys reach the DTO instance.
    const data = {
      shakeEnabled: body.shakeEnabled,
      shakeThreshold: body.shakeThreshold,
      batchWindowMinutes: body.batchWindowMinutes,
      githubEnabled: body.githubEnabled,
      githubRepository: body.githubRepository,
      autoFixEnabled: body.autoFixEnabled,
    };

    return this._bugReportSettings.model.bugReportSettings.upsert({
      where: { organizationId: orgId },
      create: { organizationId: orgId, ...data },
      update: data,
    });
  }

  createReport(orgId: string, userId: string, body: CreateBugReportDto) {
    return this._bugReport.model.bugReport.create({
      data: {
        organizationId: orgId,
        userId,
        title: body.title,
        description: body.description,
        scope: body.scope,
        route: body.route,
        platform: body.platform,
        appVersion: body.appVersion,
        diagnostics: body.diagnostics,
      },
      select: { id: true, scope: true, createdAt: true },
    });
  }

  getReports(orgId: string) {
    return this._bugReport.model.bugReport.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  deleteReport(orgId: string, id: string) {
    return this._bugReport.model.bugReport.updateMany({
      where: { id, organizationId: orgId },
      data: { deletedAt: new Date() },
    });
  }

  countPending(orgId: string) {
    return this._bugReport.model.bugReport.count({
      where: { organizationId: orgId, status: 'NEW', deletedAt: null },
    });
  }

  /**
   * The oldest still-undispatched report decides when a batch is due — the
   * window starts at the first report, so a steady trickle cannot postpone the
   * batch forever.
   */
  getOldestPending(orgId: string) {
    return this._bugReport.model.bugReport.findFirst({
      where: { organizationId: orgId, status: 'NEW', deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    });
  }

  getOrganizationsWithPendingReports() {
    return this._bugReport.model.bugReport
      .findMany({
        where: { status: 'NEW', deletedAt: null },
        select: { organizationId: true },
        distinct: ['organizationId'],
      })
      .then((rows) => rows.map((row) => row.organizationId));
  }

  getPendingReports(orgId: string) {
    return this._bugReport.model.bugReport.findMany({
      where: { organizationId: orgId, status: 'NEW', deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  markDispatched(ids: string[], batchId: string) {
    return this._bugReport.model.bugReport.updateMany({
      where: { id: { in: ids } },
      data: { status: 'DISPATCHED', batchId, dispatchedAt: new Date() },
    });
  }

  markFiled(id: string, githubIssueUrl: string) {
    return this._bugReport.model.bugReport.update({
      where: { id },
      data: { status: BugReportStatus.FILED, githubIssueUrl, lastError: null },
    });
  }

  markFailed(ids: string[], lastError: string) {
    return this._bugReport.model.bugReport.updateMany({
      where: { id: { in: ids } },
      data: { status: BugReportStatus.FAILED, lastError },
    });
  }

  /** Lets a failed batch be picked up again by the next sweep. */
  requeueFailedBefore(orgId: string, before: Date) {
    return this._bugReport.model.bugReport.updateMany({
      where: {
        organizationId: orgId,
        status: 'FAILED',
        deletedAt: null,
        updatedAt: { lt: before },
      },
      data: { status: 'NEW' },
    });
  }

  countDispatchedSince(orgId: string, since: Date) {
    return this._bugReport.model.bugReport.count({
      where: {
        organizationId: orgId,
        dispatchedAt: { gte: dayjs(since).toDate() },
      },
    });
  }
}
