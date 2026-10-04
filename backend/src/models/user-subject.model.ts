import {
  Column,
  CreatedAt,
  DataType,
  DeletedAt,
  Model,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';

@Table({
  modelName: 'UserSubject',
  paranoid: true,
  tableName: 'user_subjects',
  timestamps: true,
  underscored: true,
})
export class UserSubject extends Model {
  @Column({ autoIncrement: true, primaryKey: true, type: DataType.BIGINT.UNSIGNED })
  declare id: number;

  @Column({ allowNull: false, field: 'user_id', type: DataType.BIGINT.UNSIGNED })
  declare userId: number;

  @Column({ allowNull: false, field: 'course_subject_id', type: DataType.BIGINT.UNSIGNED })
  declare courseSubjectId: number;

  @Column({
    allowNull: true,
    field: 'period_option_item_id',
    type: DataType.BIGINT.UNSIGNED,
  })
  declare periodOptionItemId: number | null;

  @Column({ allowNull: false, defaultValue: true, field: 'is_active', type: DataType.BOOLEAN })
  declare isActive: boolean;

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
