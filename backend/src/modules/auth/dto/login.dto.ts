import { Transform, Type } from 'class-transformer';
import { IsDefined, IsEmail, MaxLength, ValidateNested } from 'class-validator';
import { EncryptedCredentialDto } from '../../../helpers/credential-encryption/credential-encryption.dto.js';

export class LoginDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  declare email: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => EncryptedCredentialDto)
  declare credential: EncryptedCredentialDto;
}
