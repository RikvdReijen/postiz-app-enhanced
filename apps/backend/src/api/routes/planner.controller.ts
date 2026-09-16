import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { PlannerService } from '@gitroom/nestjs-libraries/database/prisma/planner/planner.service';
import { PlannerSettingsDto } from '@gitroom/nestjs-libraries/dtos/planner/planner.settings.dto';

@ApiTags('Planner')
@Controller('/planner')
export class PlannerController {
  constructor(private _plannerService: PlannerService) {}

  @Get('/settings')
  async getSettings(@GetOrgFromRequest() org: Organization) {
    return this._plannerService.getSettings(org.id);
  }

  @Post('/settings')
  async updateSettings(
    @GetOrgFromRequest() org: Organization,
    @Body() body: PlannerSettingsDto
  ) {
    return this._plannerService.updateSettings(org.id, body);
  }
}
