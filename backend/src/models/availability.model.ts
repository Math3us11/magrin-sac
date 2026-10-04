import {
  Column,
  CreatedAt,
  DataType,
  DeletedAt,
  Model,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';

export enum AvailabilityState {
  ACTIVE = 'ativa',
  BLOCKED = 'bloqueada',
  CANCELLED = 'cancelada',
}

@Table({
  modelName: 'Availability',
  paranoid: true,
  tableName: 'availabilities',
  timestamps: true,
  underscored: true,
})
export class Availability extends Model {
  @Column({ autoIncrement: true, primaryKey: true, type: DataType.BIGINT.UNSIGNED })
  declare id: number;

  @Column({ allowNull: false, field: 'professor_id', type: DataType.BIGINT.UNSIGNED })
  declare professorId: number;

  @Column({ allowNull: false, field: 'starts_at', type: DataType.DATE(3) })
  declare startsAt: Date;

  @Column({ allowNull: false, field: 'ends_at', type: DataType.DATE(3) })
  declare endsAt: Date;

  @Column({
    allowNull: false,
    defaultValue: AvailabilityState.ACTIVE,
    type: DataType.ENUM(...Object.values(AvailabilityState)),
  })
  declare state: AvailabilityState;

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

  @DeletedAt
  @Column({ allowNull: true, type: DataType.DATE })
  declare deletedAt: Date | null;

  @Column({ allowNull: true, type: DataType.BIGINT.UNSIGNED })
  declare deletedBy: number | null;
}
