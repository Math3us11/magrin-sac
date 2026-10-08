export type AppointmentConfirmationMessage = {
  endsAt: Date;
  phone: string;
  professorName: string;
  protocol: string;
  startsAt: Date;
};

export type WhatsAppSendResult = {
  providerReference: string;
};

export interface WhatsAppProvider {
  sendAppointmentConfirmation(message: AppointmentConfirmationMessage): Promise<WhatsAppSendResult>;
}

export const WHATSAPP_PROVIDER = Symbol('WHATSAPP_PROVIDER');

export class WhatsAppProviderUnavailableError extends Error {
  readonly code = 'provider_not_configured';

  constructor() {
    super('O provedor de WhatsApp ainda não está configurado.');
    this.name = 'WhatsAppProviderUnavailableError';
  }
}

export class UnavailableWhatsAppProvider implements WhatsAppProvider {
  sendAppointmentConfirmation(): Promise<WhatsAppSendResult> {
    return Promise.reject(new WhatsAppProviderUnavailableError());
  }
}
