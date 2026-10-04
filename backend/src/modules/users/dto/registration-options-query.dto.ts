import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsInt, Min } from 'class-validator';

export class RegistrationOptionsQueryDto {
  @Transform(({ value }: { value: unknown }) => {
    const values = Array.isArray(value) ? value : [value];
    return values.map((item) => Number(item));
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(50)
  @IsInt({ each: true })
  @Min(1, { each: true })
  declare courseIds: number[];
}
