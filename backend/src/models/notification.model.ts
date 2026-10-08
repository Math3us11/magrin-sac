import { Column, CreatedAt, DataType, Model, Table, UpdatedAt } from 'sequelize-typescript';

export enum NotificationChannel {
  WHATSAPP = 'whatsapp',
}

export enum NotificationStatus {
  PENDING = 'pendente',
  SENT = 'enviada',
  FAILED = 'falhou',
}

export enum NotificationType {
  APPOINTMENT_CONFIRMATION = 'confirmacao_agendamento',
}

@Table({
  modelName: 'Notification',
  paranoid: false,
  tableName: 'notifications',
  timestamps: true,
  underscored: true,
})
export class Notification extends Model {
  @Column({ autoIncrement: true, primaryKey: true, type: DataType.BIGINT.UNSIGNED })
  declare id: number;

  @Column({ allowNull: false, field: 'appointment_id', type: DataType.BIGINT.UNSIGNED })
  declare appointmentId: number;

  @Column({ allowNull: false, type: DataType.ENUM(...Object.values(NotificationChannel)) })
  declare channel: NotificationChannel;

  @Column({ allowNull: false, type: DataType.ENUM(...Object.values(NotificationType)) })
  declare type: NotificationType;

  @Column({ allowNull: true, field: 'destination_hint', type: DataType.STRING(32) })
  declare destinationHint: string | null;

  @Column({ allowNull: false, type: DataType.ENUM(...Object.values(NotificationStatus)) })
  declare status: NotificationStatus;

  @Column({ allowNull: true, field: 'provider_reference', type: DataType.STRING(190) })
  declare providerReference: string | null;

  @Column({ allowNull: true, field: 'error_code', type: DataType.STRING(80) })
  declare errorCode: string | null;

  @Column({ allowNull: true, field: 'attempted_at', type: DataType.DATE(3) })
  declare attemptedAt: Date | null;

  @CreatedAt
  @Column({ allowNull: false, type: DataType.DATE })
  declare createdAt: Date;

  @Column({ allowNull: true, type: DataType.BIGINT.UNSIGNED })
  declare createdBy: number | null;

  @UpdatedAt
  @Column({ allowNull: false, type: DataType.DATE })
  declare updatedAt: Date;

  @Column({ allowNull: true, type: DataType.BIGINT.UNSIGNED })
  declare updatedBy: number | null;
}
