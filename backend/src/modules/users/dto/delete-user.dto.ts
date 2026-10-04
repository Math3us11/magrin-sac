import { Type } from 'class-transformer';
import { IsDefined, ValidateNested } from 'class-validator';
import { EncryptedCredentialDto } from '../../../helpers/credential-encryption/credential-encryption.dto.js';

export class DeleteUserDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => EncryptedCredentialDto)
  declare credential: EncryptedCredentialDto;
}

export type DeleteUserResponseDto = {
  message: string;
};
