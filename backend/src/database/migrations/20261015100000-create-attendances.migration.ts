import { DataTypes, literal, type QueryInterface } from 'sequelize';

type MigrationContext = { context: QueryInterface };

const tableOptions = {
  charset: 'utf8mb4',
  collate: 'utf8mb4_unicode_ci',
  engine: 'InnoDB',
};

export async function up({ context: queryInterface }: MigrationContext): Promise<void> {
  await queryInterface.createTable(
    'attendances',
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.BIGINT.UNSIGNED,
      },
      appointment_id: {
        allowNull: false,
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        references: { key: 'id', model: 'appointments' },
        type: DataTypes.BIGINT.UNSIGNED,
      },
      occurrence: {
        allowNull: false,
        type: DataTypes.ENUM('realizado', 'ausencia'),
      },
      resolution_status: {
        allowNull: true,
        type: DataTypes.ENUM('resolvido', 'nao_resolvido', 'em_tratativa'),
      },
      internal_notes: { allowNull: true, type: DataTypes.TEXT },
      solution: { allowNull: true, type: DataTypes.TEXT },
      referral: { allowNull: true, type: DataTypes.TEXT },
      unresolved_reason: { allowNull: true, type: DataTypes.TEXT },
      continuity_responsible: { allowNull: true, type: DataTypes.STRING(150) },
      next_step: { allowNull: true, type: DataTypes.TEXT },
      due_date: { allowNull: true, type: DataTypes.DATEONLY },
      recorded_at: { allowNull: false, type: DataTypes.DATE(3) },
      created_at: {
        allowNull: false,
        defaultValue: literal('CURRENT_TIMESTAMP'),
        type: DataTypes.DATE,
      },
      created_by: {
        allowNull: false,
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
        allowNull: false,
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        references: { key: 'id', model: 'users' },
        type: DataTypes.BIGINT.UNSIGNED,
      },
    },
    tableOptions,
  );
  await queryInterface.addIndex('attendances', ['appointment_id'], {
    name: 'uq_attendances_appointment',
    unique: true,
  });
  await queryInterface.addIndex('attendances', ['occurrence', 'resolution_status', 'recorded_at'], {
    name: 'ix_attendances_result_recorded_at',
  });

  await queryInterface.createTable(
    'attendance_status_history',
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.BIGINT.UNSIGNED,
      },
      attendance_id: {
        allowNull: false,
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        references: { key: 'id', model: 'attendances' },
        type: DataTypes.BIGINT.UNSIGNED,
      },
      occurrence: {
        allowNull: false,
        type: DataTypes.ENUM('realizado', 'ausencia'),
      },
      resolution_status: {
        allowNull: true,
        type: DataTypes.ENUM('resolvido', 'nao_resolvido', 'em_tratativa'),
      },
      change_reason: { allowNull: true, type: DataTypes.STRING(500) },
      changed_at: { allowNull: false, type: DataTypes.DATE(3) },
      created_at: {
        allowNull: false,
        defaultValue: literal('CURRENT_TIMESTAMP'),
        type: DataTypes.DATE,
      },
      created_by: {
        allowNull: false,
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        references: { key: 'id', model: 'users' },
        type: DataTypes.BIGINT.UNSIGNED,
      },
    },
    tableOptions,
  );
  await queryInterface.addIndex('attendance_status_history', ['attendance_id', 'changed_at'], {
    name: 'ix_attendance_history_attendance_changed_at',
  });
}

export async function down({ context: queryInterface }: MigrationContext): Promise<void> {
  await queryInterface.dropTable('attendance_status_history');
  await queryInterface.dropTable('attendances');
}
