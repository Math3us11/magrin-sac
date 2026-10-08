import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  Matches,
  ValidateNested,
} from 'class-validator';
import { AppointmentModality } from '../../../types/appointment-modality.type.js';

export { AppointmentModality };

export class CreateAvailabilityItemDto {
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  declare date: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  declare startTime: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  declare endTime: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(2)
  @ArrayUnique()
  @IsEnum(AppointmentModality, { each: true })
  declare modalities: AppointmentModality[];
}

export class CreateAvailabilityBatchDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => CreateAvailabilityItemDto)
  declare items: CreateAvailabilityItemDto[];
}
