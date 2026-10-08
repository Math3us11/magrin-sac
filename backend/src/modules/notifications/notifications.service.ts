import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import {
  Notification,
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from '../../models/notification.model.js';
import {
  WHATSAPP_PROVIDER,
  WhatsAppProviderUnavailableError,
  type AppointmentConfirmationMessage,
  type WhatsAppProvider,
} from './whatsapp-provider.js';

type AppointmentConfirmationInput = Omit<AppointmentConfirmationMessage, 'phone'> & {
  actorId: number;
  appointmentId: number;
  phone: string | null;
};

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification) private readonly notificationModel: typeof Notification,
    @Inject(WHATSAPP_PROVIDER) private readonly whatsappProvider: WhatsAppProvider,
  ) {}

  async attemptAppointmentConfirmation(input: AppointmentConfirmationInput): Promise<void> {
    const attempt = await this.notificationModel.create({
      appointmentId: input.appointmentId,
      channel: NotificationChannel.WHATSAPP,
      createdBy: input.actorId,
      destinationHint: this.maskPhone(input.phone),
      status: NotificationStatus.PENDING,
      type: NotificationType.APPOINTMENT_CONFIRMATION,
      updatedBy: input.actorId,
    });

    try {
      if (!input.phone) throw new NotificationDestinationMissingError();

      const result = await this.whatsappProvider.sendAppointmentConfirmation({
        endsAt: input.endsAt,
        phone: input.phone,
        professorName: input.professorName,
        protocol: input.protocol,
        startsAt: input.startsAt,
      });
      await attempt.update({
        attemptedAt: new Date(),
        errorCode: null,
        providerReference: result.providerReference,
        status: NotificationStatus.SENT,
        updatedBy: input.actorId,
      });
    } catch (error) {
      await attempt.update({
        attemptedAt: new Date(),
        errorCode:
          error instanceof WhatsAppProviderUnavailableError ||
          error instanceof NotificationDestinationMissingError
            ? error.code
            : 'provider_request_failed',
        providerReference: null,
        status: NotificationStatus.FAILED,
        updatedBy: input.actorId,
      });
      throw error;
    }
  }

  private maskPhone(phone: string | null): string | null {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, '');
    if (!digits) return null;
    return `***${digits.slice(-4)}`;
  }
}

class NotificationDestinationMissingError extends Error {
  readonly code = 'destination_missing';

  constructor() {
    super('O usuário não possui telefone configurado.');
    this.name = 'NotificationDestinationMissingError';
  }
}
