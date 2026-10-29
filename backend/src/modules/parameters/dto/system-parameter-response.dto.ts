import type { IntegerParameterName } from '../../../helpers/system-parameters/system-parameters.service.js';

export class SystemParameterItemResponseDto {
  declare description: string;
  declare fallback: number;
  declare label: string;
  declare max: number;
  declare min: number;
  declare name: IntegerParameterName;
  declare unit: 'minutes';
  // Indica que o valor em uso é o aprovado, porque a linha falta ou está inválida no banco.
  declare usingFallback: boolean;
  declare updatedAt: string | null;
  declare updatedBy: { id: number; name: string } | null;
  declare value: number;
}

export class ListSystemParametersResponseDto {
  declare parameters: SystemParameterItemResponseDto[];
}

export class UpdateSystemParameterResponseDto {
  declare message: string;
  declare parameter: SystemParameterItemResponseDto;
}
