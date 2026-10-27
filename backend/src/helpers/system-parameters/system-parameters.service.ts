import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { SystemParameter } from '../../models/system-parameter.model.js';

type IntegerParameterDefinition = {
  // Valor aprovado usado quando a linha falta ou está inválida, para não interromper a operação.
  fallback: number;
  max: number;
  min: number;
};

export const SYSTEM_PARAMETERS = {
  APPOINTMENT_CANCELLATION_MIN_NOTICE_MINUTES: { fallback: 120, max: 10_080, min: 0 },
} as const satisfies Record<string, IntegerParameterDefinition>;

export type IntegerParameterName = keyof typeof SYSTEM_PARAMETERS;

@Injectable()
export class SystemParametersService {
  private readonly logger = new Logger(SystemParametersService.name);

  constructor(
    @InjectModel(SystemParameter) private readonly systemParameterModel: typeof SystemParameter,
  ) {}

  async getInteger(name: IntegerParameterName): Promise<number> {
    const definition = SYSTEM_PARAMETERS[name];
    const parameter = await this.systemParameterModel.findOne({
      attributes: ['value'],
      where: { name },
    });
    const raw = parameter?.value.trim();
    const value = raw !== undefined && /^\d+$/.test(raw) ? Number(raw) : Number.NaN;

    if (Number.isInteger(value) && value >= definition.min && value <= definition.max) {
      return value;
    }

    this.logger.warn(
      `Parâmetro ${name} ausente ou fora do intervalo ${definition.min}-${definition.max}; ` +
        `usando ${definition.fallback}.`,
    );
    return definition.fallback;
  }
}
