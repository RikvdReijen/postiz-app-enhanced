import { Injectable } from '@nestjs/common';
import { Activity, ActivityMethod } from 'nestjs-temporal-core';
import { BugReportService } from '@gitroom/nestjs-libraries/database/prisma/bug-reports/bug.report.service';

/**
 * Sends bug-report batches whose countdown has expired.
 *
 * Batching is the whole point: ten reports from one bad afternoon become one
 * Claude Code run rather than ten, and related reports get read together.
 */
@Injectable()
@Activity()
export class BugReportActivity {
  constructor(private _bugReportService: BugReportService) {}

  @ActivityMethod()
  async dispatchDueBugBatches() {
    const due = await this._bugReportService.getOrganizationsDueForDispatch();

    let dispatched = 0;
    let filed = 0;
    for (const organizationId of due) {
      // One organization failing to reach GitHub must not stop the others.
      try {
        const result = await this._bugReportService.dispatchBatch(
          organizationId
        );
        dispatched += result.dispatched;
        filed += result.filed;
      } catch (err) {}
    }

    return { organizations: due.length, dispatched, filed };
  }
}
