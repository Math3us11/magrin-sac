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
    'course_subjects',
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.BIGINT.UNSIGNED,
      },
      course_id: {
        allowNull: false,
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        references: { key: 'id', model: 'courses' },
        type: DataTypes.BIGINT.UNSIGNED,
      },
      subject_id: {
        allowNull: false,
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        references: { key: 'id', model: 'subjects' },
        type: DataTypes.BIGINT.UNSIGNED,
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

  await queryInterface.addIndex('course_subjects', ['course_id', 'subject_id'], {
    name: 'uq_course_subjects_course_subject',
    unique: true,
  });
  await queryInterface.addIndex('course_subjects', ['course_id', 'is_active'], {
    name: 'ix_course_subjects_course_active',
  });

  await queryInterface.createTable(
    'user_subjects',
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.BIGINT.UNSIGNED,
      },
      user_id: {
        allowNull: false,
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        references: { key: 'id', model: 'users' },
        type: DataTypes.BIGINT.UNSIGNED,
      },
      course_subject_id: {
        allowNull: false,
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        references: { key: 'id', model: 'course_subjects' },
        type: DataTypes.BIGINT.UNSIGNED,
      },
      period_option_item_id: {
        allowNull: false,
        comment: 'Item pertencente à opção ACADEMIC_PERIOD',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        references: { key: 'id', model: 'system_option_items' },
        type: DataTypes.BIGINT.UNSIGNED,
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

  await queryInterface.addIndex(
    'user_subjects',
    ['user_id', 'course_subject_id', 'period_option_item_id'],
    {
      name: 'uq_user_subjects_user_course_subject_period',
      unique: true,
    },
  );
  await queryInterface.addIndex('user_subjects', ['user_id', 'is_active'], {
    name: 'ix_user_subjects_user_active',
  });
}

export async function down({ context: queryInterface }: MigrationContext): Promise<void> {
  await queryInterface.dropTable('user_subjects');
  await queryInterface.dropTable('course_subjects');
}
