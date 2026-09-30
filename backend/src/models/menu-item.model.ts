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
  modelName: 'MenuItem',
  paranoid: true,
  tableName: 'menu_items',
  timestamps: true,
  underscored: true,
})
export class MenuItem extends Model {
  @Column({ autoIncrement: true, primaryKey: true, type: DataType.BIGINT.UNSIGNED })
  declare id: number;

  @Column({ allowNull: false, type: DataType.STRING(120), unique: true })
  declare code: string;

  @Column({ allowNull: false, type: DataType.STRING(120) })
  declare label: string;

  @Column({ allowNull: true, type: DataType.STRING(120) })
  declare routeName: string | null;

  @Column({ allowNull: true, type: DataType.STRING(80) })
  declare iconKey: string | null;

  @Column({ allowNull: true, type: DataType.BIGINT.UNSIGNED })
  declare parentId: number | null;

  @Column({ allowNull: true, type: DataType.BIGINT.UNSIGNED })
  declare permissionId: number | null;

  @Column({ allowNull: false, defaultValue: 0, type: DataType.INTEGER.UNSIGNED })
  declare sortOrder: number;

  @Column({ allowNull: false, defaultValue: true, type: DataType.BOOLEAN })
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
