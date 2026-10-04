import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../decorators/current-user.decorator.js';
import { RequirePermissions } from '../../decorators/require-permissions.decorator.js';
import { PermissionGuard } from '../../guards/permission.guard.js';
import { RequestOriginGuard } from '../../guards/request-origin.guard.js';
import { SessionAuthGuard } from '../../guards/session-auth.guard.js';
import { CredentialEncryptionService } from '../../helpers/credential-encryption/credential-encryption.service.js';
import type { AuthenticatedUser } from '../../types/authenticated-user.type.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import type { CreateUserResponseDto } from './dto/create-user-response.dto.js';
import { DeleteUserDto, type DeleteUserResponseDto } from './dto/delete-user.dto.js';
import { ListUsersQueryDto } from './dto/list-users-query.dto.js';
import type { ListUsersResponseDto } from './dto/list-users-response.dto.js';
import { RegistrationOptionsQueryDto } from './dto/registration-options-query.dto.js';
import type {
  RegistrationOptionsResponseDto,
  RegistrationSubjectsResponseDto,
} from './dto/registration-options-response.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import type {
  UpdateUserResponseDto,
  UserDetailsResponseDto,
} from './dto/user-details-response.dto.js';
import { UsersService } from './users.service.js';

@Controller('admin/users')
@UseGuards(SessionAuthGuard, PermissionGuard, RequestOriginGuard)
@RequirePermissions('users.manage')
export class UsersController {
  constructor(
    private readonly credentialEncryptionService: CredentialEncryptionService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createUser(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CreateUserDto,
  ): Promise<CreateUserResponseDto> {
    const temporaryPassword = this.credentialEncryptionService.decrypt(input.temporaryPassword, {
      maxLength: 128,
      minLength: 8,
      purpose: 'user-registration',
    });

    return this.usersService.create({ ...input, temporaryPassword }, user.id);
  }

  @Get()
  listUsers(@Query() query: ListUsersQueryDto): Promise<ListUsersResponseDto> {
    return this.usersService.list(query);
  }

  @Get('registration-options')
  getRegistrationOptions(): Promise<RegistrationOptionsResponseDto> {
    return this.usersService.getRegistrationOptions();
  }

  @Get('registration-options/subjects')
  getRegistrationSubjects(
    @Query() query: RegistrationOptionsQueryDto,
  ): Promise<RegistrationSubjectsResponseDto> {
    return this.usersService.getRegistrationSubjects(query.courseIds);
  }

  @Get(':userId')
  getUser(@Param('userId', ParseIntPipe) userId: number): Promise<UserDetailsResponseDto> {
    return this.usersService.getById(userId);
  }

  @Delete(':userId')
  deleteUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() input: DeleteUserDto,
  ): Promise<DeleteUserResponseDto> {
    const confirmationPassword = this.credentialEncryptionService.decrypt(input.credential, {
      maxLength: 128,
      minLength: 1,
      purpose: 'user-deletion-confirmation',
    });

    return this.usersService.delete(userId, user.id, confirmationPassword);
  }

  @Patch(':userId')
  updateUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() input: UpdateUserDto,
  ): Promise<UpdateUserResponseDto> {
    return this.usersService.update(userId, input, user.id);
  }
}
