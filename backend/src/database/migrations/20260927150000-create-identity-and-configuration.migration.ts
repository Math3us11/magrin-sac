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
    'users',
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.BIGINT.UNSIGNED,
      },
      name: {
        allowNull: false,
        type: DataTypes.STRING(150),
      },
      email: {
        allowNull: false,
        type: DataTypes.STRING(254),
      },
      birth_date: {
        allowNull: true,
        type: DataTypes.DATEONLY,
      },
      user_type: {
        allowNull: false,
        type: DataTypes.ENUM('aluno', 'professor', 'administrador'),
      },
      password_hash: {
        allowNull: false,
        type: DataTypes.STRING(255),
      },
      cpf: {
        allowNull: false,
        comment: 'CPF normalizado com 11 dígitos, sem pontuação',
        type: DataTypes.CHAR(11),
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

  await queryInterface.addIndex('users', ['email'], {
    name: 'uq_users_email',
    unique: true,
  });
  await queryInterface.addIndex('users', ['cpf'], {
    name: 'uq_users_cpf',
    unique: true,
  });

  await queryInterface.createTable(
    'auth_sessions',
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
      token_id: {
        allowNull: false,
        comment: 'Identificador jti do JWT; não é a credencial de acesso',
        type: DataTypes.UUID,
      },
      last_activity_at: {
        allowNull: false,
        type: DataTypes.DATE,
      },
      absolute_expires_at: {
        allowNull: false,
        type: DataTypes.DATE,
      },
      reauthenticated_at: {
        allowNull: false,
        type: DataTypes.DATE,
      },
      revoked_at: {
        allowNull: true,
        type: DataTypes.DATE,
      },
      ...auditColumns(),
    },
    tableOptions,
  );

  await queryInterface.addIndex('auth_sessions', ['user_id', 'revoked_at'], {
    name: 'ix_auth_sessions_user_revoked',
  });
  await queryInterface.addIndex('auth_sessions', ['token_id'], {
    name: 'uq_auth_sessions_token_id',
    unique: true,
  });
  await queryInterface.addIndex('auth_sessions', ['absolute_expires_at'], {
    name: 'ix_auth_sessions_absolute_expiration',
  });

  await queryInterface.createTable(
    'system_parameters',
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.BIGINT.UNSIGNED,
      },
      name: {
        allowNull: false,
        type: DataTypes.STRING(120),
      },
      description: {
        allowNull: true,
        type: DataTypes.STRING(500),
      },
      value: {
        allowNull: false,
        type: DataTypes.TEXT,
      },
      ...auditColumns(),
    },
    tableOptions,
  );

  await queryInterface.addIndex('system_parameters', ['name'], {
    name: 'uq_system_parameters_name',
    unique: true,
  });

  await queryInterface.createTable(
    'integration_endpoints',
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.BIGINT.UNSIGNED,
      },
      name: {
        allowNull: false,
        type: DataTypes.STRING(120),
      },
      url: {
        allowNull: false,
        type: DataTypes.STRING(2048),
      },
      secret_env_key: {
        allowNull: true,
        type: DataTypes.STRING(120),
      },
      api_key_env_key: {
        allowNull: true,
        type: DataTypes.STRING(120),
      },
      ...auditColumns(),
    },
    tableOptions,
  );

  await queryInterface.addIndex('integration_endpoints', ['name'], {
    name: 'uq_integration_endpoints_name',
    unique: true,
  });

  await queryInterface.createTable(
    'system_options',
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.BIGINT.UNSIGNED,
      },
      name: {
        allowNull: false,
        type: DataTypes.STRING(120),
      },
      ...auditColumns(),
    },
    tableOptions,
  );

  await queryInterface.addIndex('system_options', ['name'], {
    name: 'uq_system_options_name',
    unique: true,
  });

  await queryInterface.createTable(
    'system_option_items',
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.BIGINT.UNSIGNED,
      },
      option_id: {
        allowNull: false,
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        references: { key: 'id', model: 'system_options' },
        type: DataTypes.BIGINT.UNSIGNED,
      },
      name: {
        allowNull: false,
        type: DataTypes.STRING(120),
      },
      value: {
        allowNull: false,
        type: DataTypes.STRING(190),
      },
      ...auditColumns(),
    },
    tableOptions,
  );

  await queryInterface.addIndex('system_option_items', ['option_id', 'value'], {
    name: 'uq_system_option_items_option_value',
    unique: true,
  });
}

export async function down({ context: queryInterface }: MigrationContext): Promise<void> {
  await queryInterface.dropTable('system_option_items');
  await queryInterface.dropTable('system_options');
  await queryInterface.dropTable('integration_endpoints');
  await queryInterface.dropTable('system_parameters');
  await queryInterface.dropTable('auth_sessions');
  await queryInterface.dropTable('users');
}
