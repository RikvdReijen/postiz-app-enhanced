import { proxyActivities, sleep } from '@temporalio/workflow';
import { PlannerActivity } from '@gitroom/orchestrator/activities/planner.activity';

/**
 * v2 of the missing-post sweep.
 *
 * v1 slept a fixed hour and swept every organization on the same cadence. v2
 * ticks on a short fixed interval and lets the activity decide which
 * organizations are actually due, which is what makes the cadence configurable
 * per organization without the workflow itself ever needing to change again.
 *
 * The tick has to stay in step with PLANNER_TICK_MINUTES on the service side;
 * the settings DTO floors an organization's interval at the same number.
 */
const PLANNER_TICK = '5 minutes';

const { searchForMissingPostsForDueOrganizations } =
  proxyActivities<PlannerActivity>({
    startToCloseTimeout: '10 minute',
    retry: {
      maximumAttempts: 3,
      backoffCoefficient: 1,
      initialInterval: '2 minutes',
    },
  });

export async function missingPostWorkflowV2() {
  await searchForMissingPostsForDueOrganizations();
  while (true) {
    await sleep(PLANNER_TICK);
    await searchForMissingPostsForDueOrganizations();
  }
}
