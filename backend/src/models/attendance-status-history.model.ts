import { Column, CreatedAt, DataType, Model, Table } from 'sequelize-typescript';
import { AttendanceOccurrence, AttendanceResolutionStatus } from './attendance.model.js';

@Table({
  createdAt: true,
  modelName: 'AttendanceStatusHistory',
  paranoid: false,
  tableName: 'attendance_status_history',
  timestamps: true,
  underscored: true,
  updatedAt: false,
})
export class AttendanceStatusHistory extends Model {
  @Column({ autoIncrement: true, primaryKey: true, type: DataType.BIGINT.UNSIGNED })
  declare id: number;

  @Column({ allowNull: false, field: 'attendance_id', type: DataType.BIGINT.UNSIGNED })
  declare attendanceId: number;

  @Column({ allowNull: false, type: DataType.ENUM(...Object.values(AttendanceOccurrence)) })
  declare occurrence: AttendanceOccurrence;

  @Column({
    allowNull: true,
    field: 'resolution_status',
    type: DataType.ENUM(...Object.values(AttendanceResolutionStatus)),
  })
  declare resolutionStatus: AttendanceResolutionStatus | null;

  @Column({ allowNull: true, field: 'change_reason', type: DataType.STRING(500) })
  declare changeReason: string | null;

  @Column({ allowNull: false, field: 'changed_at', type: DataType.DATE(3) })
  declare changedAt: Date;

  @CreatedAt
  @Column({ allowNull: false, type: DataType.DATE })
  declare createdAt: Date;

  @Column({ allowNull: false, type: DataType.BIGINT.UNSIGNED })
  declare createdBy: number;
}
