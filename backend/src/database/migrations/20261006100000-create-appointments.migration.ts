import { col, DataTypes, literal, Op, type QueryInterface } from 'sequelize';

type MigrationContext = {
  context: QueryInterface;
};

const tableOptions = {
  charset: 'utf8mb4',
  collate: 'utf8mb4_unicode_ci',
  engine: 'InnoDB',
};

export async function up({ context: queryInterface }: MigrationContext): Promise<void> {
  await queryInterface.createTable(
    'appointments',
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.BIGINT.UNSIGNED,
      },
      protocol: {
        allowNull: false,
        type: DataTypes.STRING(32),
      },
      availability_id: {
        allowNull: false,
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        references: { key: 'id', model: 'availabilities' },
        type: DataTypes.BIGINT.UNSIGNED,
      },
      student_id: {
        allowNull: false,
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        references: { key: 'id', model: 'users' },
        type: DataTypes.BIGINT.UNSIGNED,
      },
      modality_option_item_id: {
        allowNull: false,
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        references: { key: 'id', model: 'system_option_items' },
        type: DataTypes.BIGINT.UNSIGNED,
      },
      starts_at: {
        allowNull: false,
        comment: 'Instante normalizado em UTC',
        type: DataTypes.DATE(3),
      },
      ends_at: {
        allowNull: false,
        comment: 'Instante normalizado em UTC',
        type: DataTypes.DATE(3),
      },
      subject: {
        allowNull: false,
        type: DataTypes.STRING(150),
      },
      details: {
        allowNull: true,
        type: DataTypes.TEXT,
      },
      status: {
        allowNull: false,
        defaultValue: 'confirmado',
        type: DataTypes.ENUM('confirmado', 'cancelado', 'concluido', 'ausencia'),
      },
      cancelled_at: {
        allowNull: true,
        type: DataTypes.DATE(3),
      },
      cancelled_by: {
        allowNull: true,
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        references: { key: 'id', model: 'users' },
        type: DataTypes.BIGINT.UNSIGNED,
      },
      cancellation_reason: {
        allowNull: true,
        type: DataTypes.STRING(500),
      },
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

  await queryInterface.addConstraint('appointments', {
    fields: ['ends_at', 'starts_at'],
    name: 'ck_appointments_valid_interval',
    type: 'check',
    where: { ends_at: { [Op.gt]: col('starts_at') } },
  });
  await queryInterface.sequelize.query(`
    ALTER TABLE appointments
      ADD CONSTRAINT fk_appointments_availability_modality
      FOREIGN KEY (availability_id, modality_option_item_id)
      REFERENCES availability_modalities (availability_id, modality_option_item_id)
      ON UPDATE CASCADE
      ON DELETE RESTRICT
  `);
  await queryInterface.addIndex('appointments', ['protocol'], {
    name: 'uq_appointments_protocol',
    unique: true,
  });
  await queryInterface.addIndex(
    'appointments',
    ['availability_id', 'status', 'starts_at', 'ends_at'],
    { name: 'ix_appointments_availability_status_interval' },
  );
  await queryInterface.addIndex('appointments', ['student_id', 'status', 'starts_at', 'ends_at'], {
    name: 'ix_appointments_student_status_interval',
  });
  await queryInterface.addIndex('appointments', ['modality_option_item_id'], {
    name: 'ix_appointments_modality_item',
  });
}

export async function down({ context: queryInterface }: MigrationContext): Promise<void> {
  await queryInterface.dropTable('appointments');
}
