import { Transform, Type } from 'class-transformer';
import { IsDefined, IsNotEmpty, IsString, MaxLength, ValidateNested } from 'class-validator';
import { EncryptedCredentialDto } from '../../../helpers/credential-encryption/credential-encryption.dto.js';

function trimText({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class CancelAppointmentDto {
  @Transform(trimText)
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  declare reason: string;
}

export class CancelAdminAppointmentDto extends CancelAppointmentDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => EncryptedCredentialDto)
  declare credential: EncryptedCredentialDto;
}
