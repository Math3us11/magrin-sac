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
  modelName: 'SystemOptionItem',
  paranoid: true,
  tableName: 'system_option_items',
  timestamps: true,
  underscored: true,
})
export class SystemOptionItem extends Model {
  @Column({ autoIncrement: true, primaryKey: true, type: DataType.BIGINT.UNSIGNED })
  declare id: number;

  @Column({ allowNull: false, type: DataType.BIGINT.UNSIGNED })
  declare optionId: number;

  @Column({ allowNull: false, type: DataType.STRING(120) })
  declare name: string;

  @Column({ allowNull: false, type: DataType.STRING(190) })
  declare value: string;

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
