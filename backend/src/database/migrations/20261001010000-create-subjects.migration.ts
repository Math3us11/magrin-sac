import { DataTypes, literal, type QueryInterface } from 'sequelize';

type MigrationContext = {
  context: QueryInterface;
};

const tableOptions = {
  charset: 'utf8mb4',
  collate: 'utf8mb4_unicode_ci',
  engine: 'InnoDB',
};

function auditColumns() {
  return {
    created_at: {
      allowNull: false,
      defaultValue: literal('CURRENT_TIMESTAMP'),
      type: DataTypes.DATE,
    },
    created_by: {
      allowNull: true,
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
      references: { key: 'id', model: 'users' },
      type: DataTypes.BIGINT.UNSIGNED,
    },
    updated_at: {
      allowNull: false,
      defaultValue: literal('CURRENT_TIMESTAMP'),
      type: DataTypes.DATE,
    },
    updated_by: {
      allowNull: true,
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
      references: { key: 'id', model: 'users' },
      type: DataTypes.BIGINT.UNSIGNED,
    },
    deleted_at: {
      allowNull: true,
      type: DataTypes.DATE,
    },
    deleted_by: {
      allowNull: true,
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
      references: { key: 'id', model: 'users' },
      type: DataTypes.BIGINT.UNSIGNED,
    },
  };
}

export async function up({ context: queryInterface }: MigrationContext): Promise<void> {
  await queryInterface.createTable(
    'subjects',
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.BIGINT.UNSIGNED,
      },
      code: {
        allowNull: false,
        comment: 'Identificador estável e legível da matéria',
        type: DataTypes.STRING(160),
      },
      name: {
        allowNull: false,
        type: DataTypes.STRING(190),
      },
      is_active: {
        allowNull: false,
        defaultValue: true,
        type: DataTypes.BOOLEAN,
      },
      ...auditColumns(),
    },
    tableOptions,
  );

  await queryInterface.addIndex('subjects', ['code'], {
    name: 'uq_subjects_code',
    unique: true,
  });
  await queryInterface.addIndex('subjects', ['name'], {
    name: 'uq_subjects_name',
    unique: true,
  });
  await queryInterface.addIndex('subjects', ['is_active'], {
    name: 'ix_subjects_active',
  });
}

export async function down({ context: queryInterface }: MigrationContext): Promise<void> {
  await queryInterface.dropTable('subjects');
}
