import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { QuickAccessService } from '@gitroom/nestjs-libraries/database/prisma/quick-access/quick.access.service';
import { QuickAccessTagDto } from '@gitroom/nestjs-libraries/dtos/quick-access/quick.access.dto';

@ApiTags('Quick Access')
@Controller('/quick-access')
export class QuickAccessController {
  constructor(private _quickAccessService: QuickAccessService) {}

  @Get('/')
  async getTags(@GetOrgFromRequest() org: Organization) {
    return this._quickAccessService.getTags(org.id);
  }

  @Post('/')
  async upsertTag(
    @GetOrgFromRequest() org: Organization,
    @Body() body: QuickAccessTagDto
  ) {
    return this._quickAccessService.upsertTag(org.id, body);
  }

  @Delete('/:id')
  async deleteTag(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this._quickAccessService.deleteTag(org.id, id);
  }
}
