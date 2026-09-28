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
  modelName: 'IntegrationEndpoint',
  paranoid: true,
  tableName: 'integration_endpoints',
  timestamps: true,
  underscored: true,
})
export class IntegrationEndpoint extends Model {
  @Column({ autoIncrement: true, primaryKey: true, type: DataType.BIGINT.UNSIGNED })
  declare id: number;

  @Column({ allowNull: false, type: DataType.STRING(120), unique: true })
  declare name: string;

  @Column({ allowNull: false, type: DataType.STRING(2048) })
  declare url: string;

  @Column({ allowNull: true, type: DataType.STRING(120) })
  declare secretEnvKey: string | null;

  @Column({ allowNull: true, type: DataType.STRING(120) })
  declare apiKeyEnvKey: string | null;

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
