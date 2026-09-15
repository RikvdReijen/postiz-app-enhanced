import { Injectable } from '@nestjs/common';
import { Activity, ActivityMethod, TemporalService } from 'nestjs-temporal-core';
import { TypedSearchAttributes } from '@temporalio/common';
import { PlannerService } from '@gitroom/nestjs-libraries/database/prisma/planner/planner.service';
import {
  organizationId,
  postId as postIdSearchParam,
} from '@gitroom/nestjs-libraries/temporal/temporal.search.attribute';

/**
 * The configurable half of the missing-post sweep.
 *
 * `PostActivity.searchForMissingThreeHoursPosts` is left untouched — it is
 * already running in production workflows and its signature is frozen — so the
 * per-organization sweep lives here as a new activity behind a new workflow
 * version.
 */
@Injectable()
@Activity()
export class PlannerActivity {
  constructor(
    private _plannerService: PlannerService,
    private _temporalService: TemporalService
  ) {}

  @ActivityMethod()
  async searchForMissingPostsForDueOrganizations() {
    const due = await this._plannerService.getOrganizationsDueForScan();

    let signalled = 0;
    for (const { organizationId: orgId, lookbackHours } of due) {
      const list = await this._plannerService.getMissingPosts(
        orgId,
        lookbackHours
      );

      for (const post of list) {
        await this._temporalService.client
          .getRawClient()
          .workflow.signalWithStart('postWorkflowV112', {
            workflowId: `post_${post.id}`,
            taskQueue: 'main',
            signal: 'poke',
            workflowIdConflictPolicy: 'USE_EXISTING',
            signalArgs: [],
            args: [
              {
                taskQueue: post.integration.providerIdentifier
                  .split('-')[0]
                  .toLowerCase(),
                postId: post.id,
                organizationId: post.organizationId,
              },
            ],
            typedSearchAttributes: new TypedSearchAttributes([
              {
                key: postIdSearchParam,
                value: post.id,
              },
              {
                key: organizationId,
                value: post.organizationId,
              },
            ]),
          });

        signalled++;
      }

      // Recorded even when the organization had nothing to sweep, so its next
      // scan is measured from this tick rather than from the last one that
      // happened to find work.
      await this._plannerService.markScanned(orgId);
    }

    return { organizations: due.length, signalled };
  }
}
