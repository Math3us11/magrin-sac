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
    'permissions',
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.BIGINT.UNSIGNED,
      },
      code: {
        allowNull: false,
        comment: 'Identificador estável usado pelo backend, por exemplo users.manage',
        type: DataTypes.STRING(120),
      },
      name: {
        allowNull: false,
        type: DataTypes.STRING(150),
      },
      description: {
        allowNull: true,
        type: DataTypes.STRING(500),
      },
      ...auditColumns(),
    },
    tableOptions,
  );

  await queryInterface.addIndex('permissions', ['code'], {
    name: 'uq_permissions_code',
    unique: true,
  });

  await queryInterface.createTable(
    'user_type_permissions',
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.BIGINT.UNSIGNED,
      },
      user_type: {
        allowNull: false,
        type: DataTypes.ENUM('aluno', 'professor', 'administrador'),
      },
      permission_id: {
        allowNull: false,
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        references: { key: 'id', model: 'permissions' },
        type: DataTypes.BIGINT.UNSIGNED,
      },
      ...auditColumns(),
    },
    tableOptions,
  );

  await queryInterface.addIndex('user_type_permissions', ['user_type', 'permission_id'], {
    name: 'uq_user_type_permissions_type_permission',
    unique: true,
  });
  await queryInterface.addIndex('user_type_permissions', ['permission_id'], {
    name: 'ix_user_type_permissions_permission',
  });

  await queryInterface.createTable(
    'menu_items',
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.BIGINT.UNSIGNED,
      },
      code: {
        allowNull: false,
        comment: 'Identificador estável do item de navegação',
        type: DataTypes.STRING(120),
      },
      label: {
        allowNull: false,
        type: DataTypes.STRING(120),
      },
      route_name: {
        allowNull: true,
        comment: 'Nome de uma rota previamente registrada no frontend',
        type: DataTypes.STRING(120),
      },
      icon_key: {
        allowNull: true,
        comment: 'Chave validada pelo catálogo de ícones do frontend',
        type: DataTypes.STRING(80),
      },
      parent_id: {
        allowNull: true,
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        references: { key: 'id', model: 'menu_items' },
        type: DataTypes.BIGINT.UNSIGNED,
      },
      permission_id: {
        allowNull: true,
        comment: 'Permissão exigida; agrupadores podem herdar visibilidade dos filhos',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        references: { key: 'id', model: 'permissions' },
        type: DataTypes.BIGINT.UNSIGNED,
      },
      sort_order: {
        allowNull: false,
        defaultValue: 0,
        type: DataTypes.INTEGER.UNSIGNED,
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

  await queryInterface.addIndex('menu_items', ['code'], {
    name: 'uq_menu_items_code',
    unique: true,
  });
  await queryInterface.addIndex('menu_items', ['parent_id', 'sort_order'], {
    name: 'ix_menu_items_parent_order',
  });
  await queryInterface.addIndex('menu_items', ['permission_id'], {
    name: 'ix_menu_items_permission',
  });
}

export async function down({ context: queryInterface }: MigrationContext): Promise<void> {
  await queryInterface.dropTable('menu_items');
  await queryInterface.dropTable('user_type_permissions');
  await queryInterface.dropTable('permissions');
}
