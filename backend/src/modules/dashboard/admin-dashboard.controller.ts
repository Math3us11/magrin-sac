import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../../decorators/require-permissions.decorator.js';
import { PermissionGuard } from '../../guards/permission.guard.js';
import { RequestOriginGuard } from '../../guards/request-origin.guard.js';
import { SessionAuthGuard } from '../../guards/session-auth.guard.js';
import { DashboardService } from './dashboard.service.js';
import { DashboardQueryDto } from './dto/dashboard-query.dto.js';
import type { DashboardSummaryResponseDto } from './dto/dashboard-summary-response.dto.js';

@Controller('admin/dashboard')
@UseGuards(SessionAuthGuard, PermissionGuard, RequestOriginGuard)
@RequirePermissions('reports.dashboard.view', 'attendance.manage.any')
export class AdminDashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  summary(@Query() query: DashboardQueryDto): Promise<DashboardSummaryResponseDto> {
    return this.dashboardService.summarizeAny(query);
  }
}
