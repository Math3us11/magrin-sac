import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';
import { AuditAction, AuditEntityType } from '../../../models/audit-log.model.js';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class ListAuditLogsQueryDto {
  @Matches(ISO_DATE_PATTERN, { message: 'from deve usar o formato AAAA-MM-DD.' })
  declare from: string;

  @Matches(ISO_DATE_PATTERN, { message: 'to deve usar o formato AAAA-MM-DD.' })
  declare to: string;

  @IsOptional()
  @IsEnum(AuditAction)
  declare action?: AuditAction;

  @IsOptional()
  @IsEnum(AuditEntityType)
  declare entityType?: AuditEntityType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  declare actorId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  declare page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  declare pageSize?: number;
}
