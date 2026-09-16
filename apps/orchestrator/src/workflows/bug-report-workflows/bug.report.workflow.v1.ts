import { proxyActivities, sleep } from '@temporalio/workflow';
import { BugReportActivity } from '@gitroom/orchestrator/activities/bug.report.activity';

/**
 * Ticks on a fixed interval and lets the activity decide whose batch window has
 * expired, so an organization can change its countdown without this workflow
 * ever needing a new version.
 *
 * The tick is the floor on how precise a batch window can be; the settings DTO
 * refuses anything shorter.
 */
const BATCH_TICK = '15 minutes';

const { dispatchDueBugBatches } = proxyActivities<BugReportActivity>({
  startToCloseTimeout: '10 minute',
  retry: {
    maximumAttempts: 3,
    backoffCoefficient: 1,
    initialInterval: '2 minutes',
  },
});

export async function bugReportBatchWorkflowV1() {
  while (true) {
    await sleep(BATCH_TICK);
    await dispatchDueBugBatches();
  }
}
