import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsDefined,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { UserType } from '../../../models/user.model.js';
import { EncryptedCredentialDto } from '../../../helpers/credential-encryption/credential-encryption.dto.js';

export class CreateUserAcademicDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  declare courseIds: number[];

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(500)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  declare courseSubjectIds: number[];

  @IsOptional()
  @IsInt()
  @Min(1)
  declare academicPeriodId?: number;
}

export class CreateUserDto {
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

  @IsDefined()
  @ValidateNested()
  @Type(() => EncryptedCredentialDto)
  declare temporaryPassword: EncryptedCredentialDto;

  @ValidateIf(({ userType }: CreateUserDto) => userType !== UserType.ADMINISTRATOR)
  @IsDefined()
  @ValidateNested()
  @Type(() => CreateUserAcademicDto)
  declare academic?: CreateUserAcademicDto;
}
