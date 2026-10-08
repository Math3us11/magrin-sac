import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Notification } from '../../models/notification.model.js';
import { NotificationsService } from './notifications.service.js';
import { UnavailableWhatsAppProvider, WHATSAPP_PROVIDER } from './whatsapp-provider.js';

@Module({
  exports: [NotificationsService],
  imports: [SequelizeModule.forFeature([Notification])],
  providers: [
    NotificationsService,
    { provide: WHATSAPP_PROVIDER, useClass: UnavailableWhatsAppProvider },
  ],
})
export class NotificationsModule {}
