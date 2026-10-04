import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../decorators/current-user.decorator.js';
import { SessionAuthGuard } from '../../guards/session-auth.guard.js';
import type { AuthenticatedUser } from '../../types/authenticated-user.type.js';
import type { NavigationResponseDto } from './dto/navigation-response.dto.js';
import { NavigationService } from './navigation.service.js';

@Controller('me/navigation')
@UseGuards(SessionAuthGuard)
export class NavigationController {
  constructor(private readonly navigationService: NavigationService) {}

  @Get()
  getNavigation(@CurrentUser() user: AuthenticatedUser): Promise<NavigationResponseDto> {
    return this.navigationService.getForUserType(user.userType);
  }
}
