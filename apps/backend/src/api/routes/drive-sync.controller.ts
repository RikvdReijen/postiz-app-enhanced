import { Body, Controller, Get, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { DriveSyncService } from '@gitroom/nestjs-libraries/database/prisma/drive-sync/drive.sync.service';
import {
  ConnectDriveSyncDto,
  SyncBundleDto,
  ToggleDriveSyncDto,
} from '@gitroom/nestjs-libraries/dtos/drive-sync/drive.sync.dto';

@ApiTags('Drive Sync')
@Controller('/drive-sync')
export class DriveSyncController {
  constructor(private _driveSyncService: DriveSyncService) {}

  @Get('/')
  async getState(@GetOrgFromRequest() org: Organization) {
    return this._driveSyncService.getState(org.id);
  }

  @Get('/auth-url')
  async getAuthUrl(@GetOrgFromRequest() org: Organization) {
    return this._driveSyncService.generateAuthUrl(org.id);
  }

  @Post('/connect')
  async connect(
    @GetOrgFromRequest() org: Organization,
    @Body() body: ConnectDriveSyncDto
  ) {
    return this._driveSyncService.connect(org.id, body.code);
  }

  @Post('/disconnect')
  async disconnect(@GetOrgFromRequest() org: Organization) {
    return this._driveSyncService.disconnect(org.id);
  }

  @Put('/enabled')
  async setEnabled(
    @GetOrgFromRequest() org: Organization,
    @Body() body: ToggleDriveSyncDto
  ) {
    return this._driveSyncService.setEnabled(org.id, body.enabled);
  }

  @Post('/sync')
  async sync(@GetOrgFromRequest() org: Organization) {
    return this._driveSyncService.sync(org.id);
  }

  /** Pull path for the Android app when it can reach the host directly. */
  @Get('/bundle')
  async getBundle(@GetOrgFromRequest() org: Organization) {
    return this._driveSyncService.exportBundle(org.id);
  }

  /** Push path for the Android app when it can reach the host directly. */
  @Post('/bundle')
  async pushBundle(
    @GetOrgFromRequest() org: Organization,
    @Body() body: SyncBundleDto
  ) {
    return this._driveSyncService.mergeClientBundle(org.id, body);
  }
}
