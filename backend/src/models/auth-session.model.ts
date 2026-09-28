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
  modelName: 'AuthSession',
  paranoid: true,
  tableName: 'auth_sessions',
  timestamps: true,
  underscored: true,
})
export class AuthSession extends Model {
  @Column({ autoIncrement: true, primaryKey: true, type: DataType.BIGINT.UNSIGNED })
  declare id: number;

  @Column({ allowNull: false, type: DataType.BIGINT.UNSIGNED })
  declare userId: number;

  @Column({ allowNull: false, type: DataType.UUID, unique: true })
  declare tokenId: string;

  @Column({ allowNull: false, type: DataType.DATE })
  declare lastActivityAt: Date;

  @Column({ allowNull: false, type: DataType.DATE })
  declare absoluteExpiresAt: Date;

  @Column({ allowNull: false, type: DataType.DATE })
  declare reauthenticatedAt: Date;

  @Column({ allowNull: true, type: DataType.DATE })
  declare revokedAt: Date | null;

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
