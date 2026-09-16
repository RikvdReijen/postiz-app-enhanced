import { Injectable } from '@nestjs/common';
import dayjs from 'dayjs';
import {
  DEFAULT_LOOKBACK_HOURS,
  DEFAULT_SCAN_INTERVAL_MINUTES,
  PlannerRepository,
} from '@gitroom/nestjs-libraries/database/prisma/planner/planner.repository';
import { PlannerSettingsDto } from '@gitroom/nestjs-libraries/dtos/planner/planner.settings.dto';

/**
 * How often the sweep workflow wakes up. Every organization's interval is a
 * multiple of this in practice, which is why the DTO floors the interval here.
 */
export const PLANNER_TICK_MINUTES = 5;

@Injectable()
export class PlannerService {
  constructor(private _plannerRepository: PlannerRepository) {}

  async getSettings(orgId: string) {
    const settings = await this._plannerRepository.getSettings(orgId);

    return {
      scanIntervalMinutes:
        settings?.scanIntervalMinutes ?? DEFAULT_SCAN_INTERVAL_MINUTES,
      lookbackHours: settings?.lookbackHours ?? DEFAULT_LOOKBACK_HOURS,
      paused: settings?.paused ?? false,
      lastScanAt: settings?.lastScanAt ?? null,
      tickMinutes: PLANNER_TICK_MINUTES,
    };
  }

  updateSettings(orgId: string, body: PlannerSettingsDto) {
    return this._plannerRepository.upsertSettings(orgId, body);
  }

  /**
   * Which organizations the sweep should look at on this tick, and how far back
   * each of them wants to reach. An organization with no settings row gets the
   * upstream defaults.
   */
  async getOrganizationsDueForScan() {
    const candidates =
      await this._plannerRepository.getOrganizationsWithPendingPosts();

    if (!candidates.length) {
      return [];
    }

    const settings = await this._plannerRepository.getSettingsForOrganizations(
      candidates
    );
    const byOrg = new Map(settings.map((row) => [row.organizationId, row]));

    return candidates.flatMap((organizationId) => {
      const row = byOrg.get(organizationId);
      if (row?.paused) {
        return [];
      }

      const intervalMinutes =
        row?.scanIntervalMinutes ?? DEFAULT_SCAN_INTERVAL_MINUTES;

      const due =
        !row?.lastScanAt ||
        dayjs(row.lastScanAt).add(intervalMinutes, 'minute').isBefore(dayjs());

      return due
        ? [
            {
              organizationId,
              lookbackHours: row?.lookbackHours ?? DEFAULT_LOOKBACK_HOURS,
            },
          ]
        : [];
    });
  }

  getMissingPosts(orgId: string, lookbackHours: number) {
    return this._plannerRepository.getMissingPosts(orgId, lookbackHours);
  }

  markScanned(orgId: string) {
    return this._plannerRepository.markScanned(orgId);
  }
}
