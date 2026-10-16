import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../decorators/current-user.decorator.js';
import { RequirePermissions } from '../../decorators/require-permissions.decorator.js';
import { PermissionGuard } from '../../guards/permission.guard.js';
import { RequestOriginGuard } from '../../guards/request-origin.guard.js';
import { SessionAuthGuard } from '../../guards/session-auth.guard.js';
import type { AuthenticatedUser } from '../../types/authenticated-user.type.js';
import { DashboardService } from './dashboard.service.js';
import { DashboardQueryDto } from './dto/dashboard-query.dto.js';
import type { DashboardSummaryResponseDto } from './dto/dashboard-summary-response.dto.js';

@Controller('professor/dashboard')
@UseGuards(SessionAuthGuard, PermissionGuard, RequestOriginGuard)
@RequirePermissions('reports.dashboard.view', 'attendance.manage.assigned')
export class ProfessorDashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  summary(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DashboardQueryDto,
  ): Promise<DashboardSummaryResponseDto> {
    return this.dashboardService.summarizeAssigned(query, user.id);
  }
}
