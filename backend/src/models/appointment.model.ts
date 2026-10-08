import { Column, CreatedAt, DataType, Model, Table, UpdatedAt } from 'sequelize-typescript';

export enum AppointmentStatus {
  CONFIRMED = 'confirmado',
  CANCELLED = 'cancelado',
  COMPLETED = 'concluido',
  ABSENT = 'ausencia',
}

@Table({
  modelName: 'Appointment',
  paranoid: false,
  tableName: 'appointments',
  timestamps: true,
  underscored: true,
})
export class Appointment extends Model {
  @Column({ autoIncrement: true, primaryKey: true, type: DataType.BIGINT.UNSIGNED })
  declare id: number;

  @Column({ allowNull: false, type: DataType.STRING(32), unique: true })
  declare protocol: string;

  @Column({ allowNull: false, field: 'availability_id', type: DataType.BIGINT.UNSIGNED })
  declare availabilityId: number;

  @Column({ allowNull: false, field: 'student_id', type: DataType.BIGINT.UNSIGNED })
  declare studentId: number;

  @Column({
    allowNull: false,
    field: 'modality_option_item_id',
    type: DataType.BIGINT.UNSIGNED,
  })
  declare modalityOptionItemId: number;

  @Column({ allowNull: false, field: 'starts_at', type: DataType.DATE(3) })
  declare startsAt: Date;

  @Column({ allowNull: false, field: 'ends_at', type: DataType.DATE(3) })
  declare endsAt: Date;

  @Column({ allowNull: false, type: DataType.STRING(150) })
  declare subject: string;

  @Column({ allowNull: true, type: DataType.TEXT })
  declare details: string | null;

  @Column({
    allowNull: false,
    defaultValue: AppointmentStatus.CONFIRMED,
    type: DataType.ENUM(...Object.values(AppointmentStatus)),
  })
  declare status: AppointmentStatus;

  @Column({ allowNull: true, field: 'cancelled_at', type: DataType.DATE(3) })
  declare cancelledAt: Date | null;

  @Column({ allowNull: true, field: 'cancelled_by', type: DataType.BIGINT.UNSIGNED })
  declare cancelledBy: number | null;

  @Column({ allowNull: true, field: 'cancellation_reason', type: DataType.STRING(500) })
  declare cancellationReason: string | null;

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
