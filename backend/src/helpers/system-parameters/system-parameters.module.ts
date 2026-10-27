import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { SystemParameter } from '../../models/system-parameter.model.js';
import { SystemParametersService } from './system-parameters.service.js';

@Module({
  exports: [SystemParametersService],
  imports: [SequelizeModule.forFeature([SystemParameter])],
  providers: [SystemParametersService],
})
export class SystemParametersModule {}
