import { Injectable } from '@nestjs/common';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { PlannerSettingsDto } from '@gitroom/nestjs-libraries/dtos/planner/planner.settings.dto';

dayjs.extend(utc);

/**
 * Upstream Postiz sweeps hourly and looks two days back. Those are the defaults
 * here too, so an organization that never opens the planner screen keeps the
 * exact behaviour it had before.
 */
export const DEFAULT_SCAN_INTERVAL_MINUTES = 60;
export const DEFAULT_LOOKBACK_HOURS = 48;

/** Ceiling for the candidate query, independent of any one org's lookback. */
export const MAX_LOOKBACK_HOURS = 24 * 7;

@Injectable()
export class PlannerRepository {
  constructor(
    private _plannerSettings: PrismaRepository<'plannerSettings'>,
    private _post: PrismaRepository<'post'>
  ) {}

  getSettings(orgId: string) {
    return this._plannerSettings.model.plannerSettings.findUnique({
      where: { organizationId: orgId },
    });
  }

  upsertSettings(orgId: string, body: PlannerSettingsDto) {
    return this._plannerSettings.model.plannerSettings.upsert({
      where: { organizationId: orgId },
      create: { organizationId: orgId, ...body },
      update: body,
    });
  }

  markScanned(orgId: string) {
    return this._plannerSettings.model.plannerSettings.upsert({
      where: { organizationId: orgId },
      create: { organizationId: orgId, lastScanAt: new Date() },
      update: { lastScanAt: new Date() },
    });
  }

  /**
   * Organizations that have something the sweep could possibly pick up. Driving
   * the sweep off posts rather than off the organization table keeps the tick
   * cheap on an instance where most organizations are idle.
   */
  async getOrganizationsWithPendingPosts() {
    const rows = await this._post.model.post.findMany({
      where: {
        state: 'QUEUE',
        deletedAt: null,
        parentPostId: null,
        publishDate: {
          gte: dayjs.utc().subtract(MAX_LOOKBACK_HOURS, 'hour').toDate(),
          lt: dayjs.utc().toDate(),
        },
        integration: {
          refreshNeeded: false,
          inBetweenSteps: false,
          disabled: false,
          deletedAt: null,
        },
      },
      select: { organizationId: true },
      distinct: ['organizationId'],
    });

    return rows.map((row) => row.organizationId);
  }

  getSettingsForOrganizations(orgIds: string[]) {
    return this._plannerSettings.model.plannerSettings.findMany({
      where: { organizationId: { in: orgIds } },
    });
  }

  /** The same query upstream runs, narrowed to one org and its own window. */
  getMissingPosts(orgId: string, lookbackHours: number) {
    return this._post.model.post.findMany({
      where: {
        organizationId: orgId,
        integration: {
          refreshNeeded: false,
          inBetweenSteps: false,
          disabled: false,
          deletedAt: null,
        },
        publishDate: {
          gte: dayjs.utc().subtract(lookbackHours, 'hour').toDate(),
          lt: dayjs.utc().toDate(),
        },
        state: 'QUEUE',
        deletedAt: null,
        parentPostId: null,
      },
      select: {
        id: true,
        organizationId: true,
        publishDate: true,
        integration: { select: { providerIdentifier: true } },
      },
    });
  }
}
