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
    'audit_logs',
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.BIGINT.UNSIGNED,
      },
      actor_id: {
        allowNull: true,
        comment: 'Nulo somente para ações técnicas sem usuário autenticado',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        references: { key: 'id', model: 'users' },
        type: DataTypes.BIGINT.UNSIGNED,
      },
      action: {
        allowNull: false,
        type: DataTypes.STRING(64),
      },
      entity_type: {
        allowNull: false,
        type: DataTypes.STRING(40),
      },
      entity_id: {
        allowNull: false,
        type: DataTypes.BIGINT.UNSIGNED,
      },
      changes: {
        allowNull: true,
        comment: 'JSON com valores anteriores e novos; dados pessoais sensíveis são omitidos',
        type: DataTypes.TEXT,
      },
      reason: {
        allowNull: true,
        type: DataTypes.STRING(500),
      },
      occurred_at: {
        allowNull: false,
        comment: 'Instante normalizado em UTC',
        type: DataTypes.DATE(3),
      },
      created_at: {
        allowNull: false,
        defaultValue: literal('CURRENT_TIMESTAMP'),
        type: DataTypes.DATE,
      },
    },
    tableOptions,
  );

  await queryInterface.addIndex('audit_logs', ['occurred_at', 'id'], {
    name: 'ix_audit_logs_occurred_at',
  });
  await queryInterface.addIndex('audit_logs', ['actor_id', 'occurred_at'], {
    name: 'ix_audit_logs_actor_occurred_at',
  });
  await queryInterface.addIndex('audit_logs', ['entity_type', 'entity_id', 'occurred_at'], {
    name: 'ix_audit_logs_entity_occurred_at',
  });
  await queryInterface.addIndex('audit_logs', ['action', 'occurred_at'], {
    name: 'ix_audit_logs_action_occurred_at',
  });
}

export async function down({ context: queryInterface }: MigrationContext): Promise<void> {
  await queryInterface.dropTable('audit_logs');
}
