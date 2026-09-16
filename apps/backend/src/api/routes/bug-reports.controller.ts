import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization, User } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { BugReportService } from '@gitroom/nestjs-libraries/database/prisma/bug-reports/bug.report.service';
import {
  BugReportSettingsDto,
  CreateBugReportDto,
} from '@gitroom/nestjs-libraries/dtos/bug-reports/bug.report.dto';

@ApiTags('Bug Reports')
@Controller('/bug-reports')
export class BugReportsController {
  constructor(private _bugReportService: BugReportService) {}

  @Get('/')
  async getReports(@GetOrgFromRequest() org: Organization) {
    return this._bugReportService.getReports(org.id);
  }

  @Post('/')
  async createReport(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User,
    @Body() body: CreateBugReportDto
  ) {
    return this._bugReportService.createReport(org.id, user.id, body);
  }

  @Delete('/:id')
  async deleteReport(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this._bugReportService.deleteReport(org.id, id);
  }

  @Get('/settings')
  async getSettings(@GetOrgFromRequest() org: Organization) {
    return this._bugReportService.getSettings(org.id);
  }

  @Post('/settings')
  async updateSettings(
    @GetOrgFromRequest() org: Organization,
    @Body() body: BugReportSettingsDto
  ) {
    return this._bugReportService.updateSettings(org.id, body);
  }

  /** Sends the waiting batch immediately instead of waiting for the countdown. */
  @Post('/dispatch')
  async dispatchNow(@GetOrgFromRequest() org: Organization) {
    return this._bugReportService.dispatchNow(org.id);
  }
}
