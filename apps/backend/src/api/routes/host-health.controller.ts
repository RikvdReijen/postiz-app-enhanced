import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HostStatusService } from '@gitroom/nestjs-libraries/host/host.status.service';

/**
 * The detailed breakdown, behind auth: knowing that the orchestrator is down is
 * operational information, and it costs a Temporal round trip per call.
 */
@ApiTags('Host')
@Controller('/host')
export class HostHealthController {
  constructor(private _hostStatusService: HostStatusService) {}

  @Get('/health')
  getHealth() {
    return this._hostStatusService.getHealth();
  }
}
