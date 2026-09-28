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
  modelName: 'SystemOption',
  paranoid: true,
  tableName: 'system_options',
  timestamps: true,
  underscored: true,
})
export class SystemOption extends Model {
  @Column({ autoIncrement: true, primaryKey: true, type: DataType.BIGINT.UNSIGNED })
  declare id: number;

  @Column({ allowNull: false, type: DataType.STRING(120), unique: true })
  declare name: string;

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
