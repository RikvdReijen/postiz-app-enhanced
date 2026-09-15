import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization, User } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { MobilePairingService } from '@gitroom/nestjs-libraries/mobile/mobile.pairing.service';

@ApiTags('Mobile')
@Controller('/mobile')
export class MobileController {
  constructor(private _mobilePairingService: MobilePairingService) {}

  @Get('/pairing')
  async getPairing(
    @GetUserFromRequest() user: User,
    @GetOrgFromRequest() org: Organization
  ) {
    return this._mobilePairingService.createPairing(user, org);
  }
}
