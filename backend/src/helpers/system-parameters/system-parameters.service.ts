import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { SystemParameter } from '../../models/system-parameter.model.js';

type IntegerParameterDefinition = {
  description: string;
  // Valor aprovado usado quando a linha falta ou está inválida, para não interromper a operação.
  fallback: number;
  label: string;
  max: number;
  min: number;
  unit: 'minutes';
};

export const SYSTEM_PARAMETERS = {
  APPOINTMENT_CANCELLATION_MIN_NOTICE_MINUTES: {
    description:
      'Antecedência mínima para aluno e professor cancelarem um agendamento. ' +
      'O administrador pode cancelar até o início.',
    fallback: 120,
    label: 'Antecedência mínima de cancelamento',
    max: 10_080,
    min: 0,
    unit: 'minutes',
  },
} as const satisfies Record<string, IntegerParameterDefinition>;

export type IntegerParameterName = keyof typeof SYSTEM_PARAMETERS;

export function isIntegerParameterName(name: string): name is IntegerParameterName {
  return Object.hasOwn(SYSTEM_PARAMETERS, name);
}

// Converte o texto persistido; nulo quando ausente, não inteiro ou fora do intervalo do catálogo.
export function parseIntegerParameter(
  name: IntegerParameterName,
  raw: string | null | undefined,
): number | null {
  const definition = SYSTEM_PARAMETERS[name];
  const trimmed = raw?.trim();
  if (trimmed === undefined || !/^\d+$/.test(trimmed)) return null;

  const value = Number(trimmed);
  return Number.isInteger(value) && value >= definition.min && value <= definition.max
    ? value
    : null;
}

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
    const value = parseIntegerParameter(name, parameter?.value);

    if (value !== null) return value;

    this.logger.warn(
      `Parâmetro ${name} ausente ou fora do intervalo ${definition.min}-${definition.max}; ` +
        `usando ${definition.fallback}.`,
    );
    return definition.fallback;
  }
}
