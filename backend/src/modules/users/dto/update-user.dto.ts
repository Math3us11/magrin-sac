import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsDefined,
  IsEmail,
  IsEnum,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { UserType } from '../../../models/user.model.js';
import { CreateUserAcademicDto } from './create-user.dto.js';

export class UpdateUserDto {
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  declare name: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  declare email: string;

  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  declare birthDate: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.replace(/\D/g, '') : value,
  )
  @Matches(/^\d{11}$/)
  declare cpf: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.replace(/\D/g, '') : value,
  )
  @IsString()
  @Matches(/^\d{10,11}$/)
  declare phone: string;

  @IsEnum(UserType)
  declare userType: UserType;

  @IsBoolean()
  declare isActive: boolean;

  @ValidateIf(({ userType }: UpdateUserDto) => userType !== UserType.ADMINISTRATOR)
  @IsDefined()
  @ValidateNested()
  @Type(() => CreateUserAcademicDto)
  declare academic?: CreateUserAcademicDto;
}
