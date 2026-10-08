import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../config/app.config.js';

type ZonedDateTimeParts = {
  day: number;
  hour: number;
  minute: number;
  month: number;
  second: number;
  year: number;
};

@Injectable()
export class InstitutionDateTimeService {
  readonly timeZone: string;

  constructor(configService: ConfigService) {
    this.timeZone = configService.getOrThrow<AppConfig>('app').timeZone;
  }

  localToUtc(date: string, time: string): Date {
    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute] = time.split(':').map(Number);

    if (
      year === undefined ||
      month === undefined ||
      day === undefined ||
      hour === undefined ||
      minute === undefined
    ) {
      throw new BadRequestException('Data ou horário inválido.');
    }

    const wallClock = Date.UTC(year, month - 1, day, hour, minute);
    let result = new Date(wallClock);

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const rendered = this.zonedParts(result);
      const renderedAsUtc = Date.UTC(
        rendered.year,
        rendered.month - 1,
        rendered.day,
        rendered.hour,
        rendered.minute,
        rendered.second,
      );
      result = new Date(wallClock - (renderedAsUtc - result.getTime()));
    }

    const verification = this.zonedParts(result);
    if (
      verification.year !== year ||
      verification.month !== month ||
      verification.day !== day ||
      verification.hour !== hour ||
      verification.minute !== minute
    ) {
      throw new BadRequestException('Data ou horário inexistente no timezone institucional.');
    }

    return result;
  }

  private zonedParts(value: Date): ZonedDateTimeParts {
    const parts = new Intl.DateTimeFormat('en-CA', {
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
      minute: '2-digit',
      month: '2-digit',
      second: '2-digit',
      timeZone: this.timeZone,
      year: 'numeric',
    }).formatToParts(value);
    const part = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((candidate) => candidate.type === type)?.value);

    return {
      day: part('day'),
      hour: part('hour'),
      minute: part('minute'),
      month: part('month'),
      second: part('second'),
      year: part('year'),
    };
  }
}
