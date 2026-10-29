import { Column, CreatedAt, DataType, Model, Table } from 'sequelize-typescript';

export enum AuditAction {
  APPOINTMENT_CANCELLED = 'appointment.cancelled',
  APPOINTMENT_CREATED = 'appointment.created',
  AVAILABILITY_BLOCKED = 'availability.blocked',
  AVAILABILITY_CREATED = 'availability.created',
  AVAILABILITY_UNBLOCKED = 'availability.unblocked',
  SYSTEM_PARAMETER_UPDATED = 'system_parameter.updated',
  USER_CREATED = 'user.created',
  USER_DELETED = 'user.deleted',
  USER_UPDATED = 'user.updated',
}

export enum AuditEntityType {
  APPOINTMENT = 'appointment',
  AVAILABILITY = 'availability',
  SYSTEM_PARAMETER = 'system_parameter',
  USER = 'user',
}

@Table({
  createdAt: true,
  modelName: 'AuditLog',
  paranoid: false,
  tableName: 'audit_logs',
  timestamps: true,
  underscored: true,
  updatedAt: false,
})
export class AuditLog extends Model {
  @Column({ autoIncrement: true, primaryKey: true, type: DataType.BIGINT.UNSIGNED })
  declare id: number;

  @Column({ allowNull: true, field: 'actor_id', type: DataType.BIGINT.UNSIGNED })
  declare actorId: number | null;

  @Column({ allowNull: false, type: DataType.STRING(64) })
  declare action: AuditAction;

  @Column({ allowNull: false, field: 'entity_type', type: DataType.STRING(40) })
  declare entityType: AuditEntityType;

  @Column({ allowNull: false, field: 'entity_id', type: DataType.BIGINT.UNSIGNED })
  declare entityId: number;

  @Column({ allowNull: true, type: DataType.TEXT })
  declare changes: string | null;

  @Column({ allowNull: true, type: DataType.STRING(500) })
  declare reason: string | null;

  @Column({ allowNull: false, field: 'occurred_at', type: DataType.DATE(3) })
  declare occurredAt: Date;

  @CreatedAt
  @Column({ allowNull: false, type: DataType.DATE })
  declare createdAt: Date;
}
