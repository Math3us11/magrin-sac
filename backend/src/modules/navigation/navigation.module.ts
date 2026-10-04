import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { MenuItem } from '../../models/menu-item.model.js';
import { AuthModule } from '../auth/auth.module.js';
import { NavigationController } from './navigation.controller.js';
import { NavigationService } from './navigation.service.js';

@Module({
  controllers: [NavigationController],
  imports: [AuthModule, SequelizeModule.forFeature([MenuItem])],
  providers: [NavigationService],
})
export class NavigationModule {}
