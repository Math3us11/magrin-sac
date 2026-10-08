import { DataTypes, literal, type QueryInterface } from 'sequelize';

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
    'notifications',
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
      channel: {
        allowNull: false,
        type: DataTypes.ENUM('whatsapp'),
      },
      type: {
        allowNull: false,
        type: DataTypes.ENUM('confirmacao_agendamento'),
      },
      destination_hint: {
        allowNull: true,
        comment: 'Destino mascarado; o número completo não é persistido nesta tabela',
        type: DataTypes.STRING(32),
      },
      status: {
        allowNull: false,
        defaultValue: 'pendente',
        type: DataTypes.ENUM('pendente', 'enviada', 'falhou'),
      },
      provider_reference: {
        allowNull: true,
        type: DataTypes.STRING(190),
      },
      error_code: {
        allowNull: true,
        comment: 'Código sanitizado, sem conteúdo retornado pelo provedor',
        type: DataTypes.STRING(80),
      },
      attempted_at: {
        allowNull: true,
        type: DataTypes.DATE(3),
      },
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
    },
    tableOptions,
  );

  await queryInterface.addIndex('notifications', ['appointment_id', 'type', 'status'], {
    name: 'ix_notifications_appointment_type_status',
  });
}

export async function down({ context: queryInterface }: MigrationContext): Promise<void> {
  await queryInterface.dropTable('notifications');
}
