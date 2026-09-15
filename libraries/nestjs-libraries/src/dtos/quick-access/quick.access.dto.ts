import { QuickAccessTarget } from '@prisma/client';
import {
  IsDefined,
  IsEnum,
  IsHexColor,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class QuickAccessTagDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsDefined()
  @MaxLength(60)
  name: string;

  @IsEnum(QuickAccessTarget)
  @IsDefined()
  target: QuickAccessTarget;

  /** Set when the tag opens the composer on one specific connected account. */
  @IsOptional()
  @IsString()
  integrationId?: string;

  /** Set when the tag opens the composer filtered to a platform. */
  @IsOptional()
  @IsString()
  providerIdentifier?: string;

  /** Which of the four PostPls marks to print in the middle of the QR code. */
  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsHexColor()
  accentColor?: string;
}
