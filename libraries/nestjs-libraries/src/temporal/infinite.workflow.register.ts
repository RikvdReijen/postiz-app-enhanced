import { Global, Injectable, Module, OnModuleInit } from '@nestjs/common';
import { TemporalService } from 'nestjs-temporal-core';

const LEGACY_MISSING_POST_WORKFLOW_ID = 'missing-post-workflow';
const MISSING_POST_WORKFLOW_ID = 'missing-post-workflow-v2';
const BUG_REPORT_BATCH_WORKFLOW_ID = 'bug-report-batch-workflow-v1';

@Injectable()
export class InfiniteWorkflowRegister implements OnModuleInit {
  constructor(private _temporalService: TemporalService) {}

  async onModuleInit(): Promise<void> {
    if (!!process.env.RUN_CRON) {
      // The v1 sweep runs forever on a fixed hourly loop, so an instance
      // upgrading to PostPls would otherwise end up with both sweeps running
      // and every organization scanned twice.
      try {
        const legacy = await this._temporalService.client.getWorkflowHandle(
          LEGACY_MISSING_POST_WORKFLOW_ID
        );

        if (legacy && (await legacy.describe()).status.name === 'RUNNING') {
          await legacy.terminate('replaced by missingPostWorkflowV2');
        }
      } catch (err) {}

      try {
        await this._temporalService.client
          ?.getRawClient()
          ?.workflow?.start('missingPostWorkflowV2', {
            workflowId: MISSING_POST_WORKFLOW_ID,
            taskQueue: 'main',
          });
      } catch (err) {}

      try {
        await this._temporalService.client
          ?.getRawClient()
          ?.workflow?.start('bugReportBatchWorkflowV1', {
            workflowId: BUG_REPORT_BATCH_WORKFLOW_ID,
            taskQueue: 'main',
          });
      } catch (err) {}
    }
  }
}

@Global()
@Module({
  imports: [],
  controllers: [],
  providers: [InfiniteWorkflowRegister],
  get exports() {
    return this.providers;
  },
})
export class InfiniteWorkflowRegisterModule {}
