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
    'courses',
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.BIGINT.UNSIGNED,
      },
      code: {
        allowNull: false,
        comment: 'Identificador estável e legível do curso',
        type: DataTypes.STRING(120),
      },
      name: {
        allowNull: false,
        type: DataTypes.STRING(190),
      },
      education_level: {
        allowNull: false,
        type: DataTypes.ENUM('graduacao', 'pos_graduacao'),
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

  await queryInterface.addIndex('courses', ['code'], {
    name: 'uq_courses_code',
    unique: true,
  });
  await queryInterface.addIndex('courses', ['name', 'education_level'], {
    name: 'uq_courses_name_level',
    unique: true,
  });
  await queryInterface.addIndex('courses', ['education_level', 'is_active'], {
    name: 'ix_courses_level_active',
  });
}

export async function down({ context: queryInterface }: MigrationContext): Promise<void> {
  await queryInterface.dropTable('courses');
}
