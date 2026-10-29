import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../decorators/current-user.decorator.js';
import { RequirePermissions } from '../../decorators/require-permissions.decorator.js';
import { PermissionGuard } from '../../guards/permission.guard.js';
import { RequestOriginGuard } from '../../guards/request-origin.guard.js';
import { SessionAuthGuard } from '../../guards/session-auth.guard.js';
import type { AuthenticatedUser } from '../../types/authenticated-user.type.js';
import type {
  ListSystemParametersResponseDto,
  UpdateSystemParameterResponseDto,
} from './dto/system-parameter-response.dto.js';
import { UpdateSystemParameterDto } from './dto/update-system-parameter.dto.js';
import { ParametersService } from './parameters.service.js';

@Controller('admin/system-parameters')
@UseGuards(SessionAuthGuard, PermissionGuard, RequestOriginGuard)
@RequirePermissions('parameters.manage')
export class AdminParametersController {
  constructor(private readonly parametersService: ParametersService) {}

  @Get()
  list(): Promise<ListSystemParametersResponseDto> {
    return this.parametersService.list();
  }

  @Patch(':name')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('name') name: string,
    @Body() input: UpdateSystemParameterDto,
  ): Promise<UpdateSystemParameterResponseDto> {
    return this.parametersService.update(name, input, user.id);
  }
}
