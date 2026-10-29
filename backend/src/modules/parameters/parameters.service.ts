import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import {
  isIntegerParameterName,
  parseIntegerParameter,
  SYSTEM_PARAMETERS,
  type IntegerParameterName,
} from '../../helpers/system-parameters/system-parameters.service.js';
import { AuditAction, AuditEntityType } from '../../models/audit-log.model.js';
import { SystemParameter } from '../../models/system-parameter.model.js';
import { User } from '../../models/user.model.js';
import { AuditService, diffAuditFields } from '../audit/audit.service.js';
import type {
  ListSystemParametersResponseDto,
  SystemParameterItemResponseDto,
  UpdateSystemParameterResponseDto,
} from './dto/system-parameter-response.dto.js';
import type { UpdateSystemParameterDto } from './dto/update-system-parameter.dto.js';

@Injectable()
export class ParametersService {
  constructor(
    @InjectModel(SystemParameter) private readonly systemParameterModel: typeof SystemParameter,
    @InjectModel(User) private readonly userModel: typeof User,
    @InjectConnection() private readonly sequelize: Sequelize,
    private readonly auditService: AuditService,
  ) {}

  async list(): Promise<ListSystemParametersResponseDto> {
    const names = Object.keys(SYSTEM_PARAMETERS) as IntegerParameterName[];
    const rows = await this.systemParameterModel.findAll({
      attributes: ['name', 'updatedAt', 'updatedBy', 'value'],
      where: { name: { [Op.in]: names } },
    });
    const rowsByName = new Map(rows.map((row) => [row.name, row] as const));
    const editors = await this.findEditors(rows);

    return {
      parameters: names.map((name) => this.toResponse(name, rowsByName.get(name) ?? null, editors)),
    };
  }

  async update(
    name: string,
    input: UpdateSystemParameterDto,
    actorId: number,
  ): Promise<UpdateSystemParameterResponseDto> {
    if (!isIntegerParameterName(name)) throw new NotFoundException('Parâmetro não encontrado.');

    const definition = SYSTEM_PARAMETERS[name];
    if (input.value < definition.min || input.value > definition.max) {
      throw new BadRequestException(
        `O valor deve estar entre ${definition.min} e ${definition.max}.`,
      );
    }

    const row = await this.sequelize.transaction(async (transaction) => {
      // A linha travada serializa alterações simultâneas e mantém o histórico coerente.
      let parameter = await this.systemParameterModel.findOne({
        lock: transaction.LOCK.UPDATE,
        paranoid: false,
        transaction,
        where: { name },
      });
      const previous = parseIntegerParameter(name, parameter?.value);

      if (previous === input.value && !parameter?.deletedAt) {
        throw new BadRequestException('O novo valor é igual ao valor atual.');
      }

      if (parameter) {
        if (parameter.deletedAt) await parameter.restore({ transaction });
        await parameter.update(
          { updatedBy: actorId, value: String(input.value) },
          { fields: ['updatedBy', 'value'], transaction },
        );
      } else {
        parameter = await this.systemParameterModel.create(
          {
            createdBy: actorId,
            description: definition.description,
            name,
            updatedBy: actorId,
            value: String(input.value),
          },
          { transaction },
        );
      }

      await this.auditService.record(
        {
          action: AuditAction.SYSTEM_PARAMETER_UPDATED,
          actorId,
          changes: diffAuditFields(
            { value: previous },
            { value: input.value },
            { fields: ['value'] },
          ),
          entityId: parameter.id,
          entityType: AuditEntityType.SYSTEM_PARAMETER,
          reason: input.reason,
        },
        transaction,
      );

      return parameter;
    });

    const editors = await this.findEditors([row]);
    return {
      message: 'Parâmetro atualizado com sucesso.',
      parameter: this.toResponse(name, row, editors),
    };
  }

  private async findEditors(rows: SystemParameter[]): Promise<Map<number, string>> {
    const ids = [
      ...new Set(rows.flatMap(({ updatedBy }) => (updatedBy === null ? [] : [updatedBy]))),
    ];
    if (ids.length === 0) return new Map();

    const users = await this.userModel.unscoped().findAll({
      attributes: ['id', 'name'],
      paranoid: false,
      where: { id: { [Op.in]: ids } },
    });
    return new Map(users.map(({ id, name }) => [id, name] as const));
  }

  private toResponse(
    name: IntegerParameterName,
    row: SystemParameter | null,
    editors: Map<number, string>,
  ): SystemParameterItemResponseDto {
    const definition = SYSTEM_PARAMETERS[name];
    const stored = parseIntegerParameter(name, row?.value);
    const editorName = row?.updatedBy ? editors.get(row.updatedBy) : undefined;

    return {
      description: definition.description,
      fallback: definition.fallback,
      label: definition.label,
      max: definition.max,
      min: definition.min,
      name,
      unit: definition.unit,
      updatedAt: row?.updatedAt?.toISOString() ?? null,
      updatedBy:
        row?.updatedBy && editorName !== undefined ? { id: row.updatedBy, name: editorName } : null,
      usingFallback: stored === null,
      value: stored ?? definition.fallback,
    };
  }
}
