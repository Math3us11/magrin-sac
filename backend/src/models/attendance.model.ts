import { Column, CreatedAt, DataType, Model, Table, UpdatedAt } from 'sequelize-typescript';

export enum AttendanceOccurrence {
  ABSENCE = 'ausencia',
  HELD = 'realizado',
}

export enum AttendanceResolutionStatus {
  IN_PROGRESS = 'em_tratativa',
  RESOLVED = 'resolvido',
  UNRESOLVED = 'nao_resolvido',
}

@Table({
  modelName: 'Attendance',
  paranoid: false,
  tableName: 'attendances',
  timestamps: true,
  underscored: true,
})
export class Attendance extends Model {
  @Column({ autoIncrement: true, primaryKey: true, type: DataType.BIGINT.UNSIGNED })
  declare id: number;

  @Column({
    allowNull: false,
    field: 'appointment_id',
    type: DataType.BIGINT.UNSIGNED,
    unique: true,
  })
  declare appointmentId: number;

  @Column({ allowNull: false, type: DataType.ENUM(...Object.values(AttendanceOccurrence)) })
  declare occurrence: AttendanceOccurrence;

  @Column({
    allowNull: true,
    field: 'resolution_status',
    type: DataType.ENUM(...Object.values(AttendanceResolutionStatus)),
  })
  declare resolutionStatus: AttendanceResolutionStatus | null;

  @Column({ allowNull: true, field: 'internal_notes', type: DataType.TEXT })
  declare internalNotes: string | null;

  @Column({ allowNull: true, type: DataType.TEXT })
  declare solution: string | null;

  @Column({ allowNull: true, type: DataType.TEXT })
  declare referral: string | null;

  @Column({ allowNull: true, field: 'unresolved_reason', type: DataType.TEXT })
  declare unresolvedReason: string | null;

  @Column({ allowNull: true, field: 'continuity_responsible', type: DataType.STRING(150) })
  declare continuityResponsible: string | null;

  @Column({ allowNull: true, field: 'next_step', type: DataType.TEXT })
  declare nextStep: string | null;

  @Column({ allowNull: true, field: 'due_date', type: DataType.DATEONLY })
  declare dueDate: string | null;

  @Column({ allowNull: false, field: 'recorded_at', type: DataType.DATE(3) })
  declare recordedAt: Date;

  @CreatedAt
  @Column({ allowNull: false, type: DataType.DATE })
  declare createdAt: Date;

  @Column({ allowNull: false, type: DataType.BIGINT.UNSIGNED })
  declare createdBy: number;

  @UpdatedAt
  @Column({ allowNull: false, type: DataType.DATE })
  declare updatedAt: Date;

  @Column({ allowNull: false, type: DataType.BIGINT.UNSIGNED })
  declare updatedBy: number;
}
