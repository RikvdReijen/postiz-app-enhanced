import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class PlannerSettingsDto {
  /**
   * How often the planner looks for posts that are due but were never picked
   * up. Floored at the orchestrator's own tick so the UI cannot promise a
   * cadence the sweep is unable to honour.
   */
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(1440)
  scanIntervalMinutes?: number;

  /** How far back a sweep is willing to reach for a missed post. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168)
  lookbackHours?: number;

  @IsOptional()
  @IsBoolean()
  paused?: boolean;
}
