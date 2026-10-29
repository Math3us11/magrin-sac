import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../../decorators/require-permissions.decorator.js';
import { PermissionGuard } from '../../guards/permission.guard.js';
import { RequestOriginGuard } from '../../guards/request-origin.guard.js';
import { SessionAuthGuard } from '../../guards/session-auth.guard.js';
import { AuditService } from './audit.service.js';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs.dto.js';
import type { ListAuditLogsResponseDto } from './dto/list-audit-logs-response.dto.js';

@Controller('admin/audit-logs')
@UseGuards(SessionAuthGuard, PermissionGuard, RequestOriginGuard)
@RequirePermissions('audit.read')
export class AdminAuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  list(@Query() query: ListAuditLogsQueryDto): Promise<ListAuditLogsResponseDto> {
    return this.auditService.list(query);
  }
}
