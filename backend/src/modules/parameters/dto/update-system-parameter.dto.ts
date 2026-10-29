import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';

export class UpdateSystemParameterDto {
  // O intervalo específico de cada parâmetro é validado pelo catálogo no service.
  @Type(() => Number)
  @IsInt({ message: 'Informe um número inteiro.' })
  @Min(0, { message: 'Informe um número inteiro.' })
  declare value: number;

  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Informe o motivo da alteração.' })
  @IsNotEmpty({ message: 'Informe o motivo da alteração.' })
  @MaxLength(500)
  declare reason: string;
}
