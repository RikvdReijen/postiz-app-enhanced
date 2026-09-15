import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HostStatusService } from '@gitroom/nestjs-libraries/host/host.status.service';

/**
 * Unauthenticated on purpose: the Android app has to be able to ask "are you
 * there?" before it does anything else, and a request that never completes is
 * exactly the answer it needs when the desktop is asleep.
 */
@ApiTags('Host')
@Controller('/host')
export class HostController {
  constructor(private _hostStatusService: HostStatusService) {}

  @Get('/status')
  getStatus() {
    return this._hostStatusService.getPublicStatus();
  }
}
