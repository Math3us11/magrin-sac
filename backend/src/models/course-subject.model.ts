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
  modelName: 'CourseSubject',
  paranoid: true,
  tableName: 'course_subjects',
  timestamps: true,
  underscored: true,
})
export class CourseSubject extends Model {
  @Column({ autoIncrement: true, primaryKey: true, type: DataType.BIGINT.UNSIGNED })
  declare id: number;

  @Column({ allowNull: false, field: 'course_id', type: DataType.BIGINT.UNSIGNED })
  declare courseId: number;

  @Column({ allowNull: false, field: 'subject_id', type: DataType.BIGINT.UNSIGNED })
  declare subjectId: number;

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
