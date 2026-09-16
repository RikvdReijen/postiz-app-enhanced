import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsDefined,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class ConnectDriveSyncDto {
  @IsString()
  @IsDefined()
  code: string;
}

export class ToggleDriveSyncDto {
  @IsBoolean()
  @IsDefined()
  enabled: boolean;
}

export class SyncPostDto {
  @IsString()
  @IsDefined()
  id: string;

  @IsString()
  @IsDefined()
  group: string;

  @IsOptional()
  @IsString()
  integrationId: string | null;

  @IsOptional()
  @IsString()
  providerIdentifier: string | null;

  @IsString()
  @IsDefined()
  content: string;

  @IsDateString()
  @IsDefined()
  publishDate: string;

  @IsIn(['DRAFT', 'QUEUE', 'PUBLISHED', 'ERROR'])
  state: 'DRAFT' | 'QUEUE' | 'PUBLISHED' | 'ERROR';

  @IsDateString()
  @IsDefined()
  updatedAt: string;

  @IsOptional()
  @IsDateString()
  deletedAt: string | null;

  @IsIn(['host', 'mobile'])
  origin: 'host' | 'mobile';
}

/**
 * Used when the Android app can reach the host directly. It is the same bundle
 * that otherwise travels through Google Drive, so the two paths converge on the
 * same merge rules.
 */
export class SyncBundleDto {
  @IsInt()
  @IsDefined()
  version: number;

  @IsString()
  @IsDefined()
  organizationId: string;

  @IsInt()
  @IsDefined()
  revision: number;

  @IsDateString()
  @IsDefined()
  generatedAt: string;

  @IsIn(['host', 'mobile'])
  generatedBy: 'host' | 'mobile';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncPostDto)
  posts: SyncPostDto[];
}
