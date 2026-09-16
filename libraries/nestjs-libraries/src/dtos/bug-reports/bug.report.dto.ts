import { BugScope } from '@prisma/client';
import {
  IsBoolean,
  IsDefined,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateBugReportDto {
  @IsString()
  @IsDefined()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsDefined()
  @MaxLength(5000)
  description: string;

  /**
   * Whether this is a PostPls bug or one inherited from upstream Postiz. The
   * client suggests a value from the screen the reporter was on; they can
   * override it, because only they know what actually misbehaved.
   */
  @IsEnum(BugScope)
  @IsDefined()
  scope: BugScope;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  route?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  platform?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  appVersion?: string;

  /** JSON blob of host/sync/device state, collected automatically. */
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  diagnostics?: string;
}

export class BugReportSettingsDto {
  @IsOptional()
  @IsBoolean()
  shakeEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(8)
  @Max(40)
  shakeThreshold?: number;

  /**
   * Floored at 15 minutes: the whole point of batching is that reports pile up
   * into one cloud session, and a window shorter than the sweep interval would
   * just dispatch them one at a time.
   */
  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(10080)
  batchWindowMinutes?: number;

  @IsOptional()
  @IsBoolean()
  githubEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  githubRepository?: string;

  @IsOptional()
  @IsBoolean()
  autoFixEnabled?: boolean;
}
