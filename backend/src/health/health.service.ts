import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';

export type HealthResponse = {
  database: 'reachable';
  service: 'backend';
  status: 'ok';
};

@Injectable()
export class HealthService {
  constructor(@InjectConnection() private readonly sequelize: Sequelize) {}

  async getHealth(): Promise<HealthResponse> {
    await this.sequelize.authenticate();

    return {
      database: 'reachable',
      service: 'backend',
      status: 'ok',
    };
  }
}
