import {
  col,
  DataTypes,
  literal,
  Op,
  QueryTypes,
  type QueryInterface,
  type Transaction,
} from 'sequelize';

type MigrationContext = {
  context: QueryInterface;
};

const MODALITY_OPTION = 'APPOINTMENT_MODALITY';
const modalityItems = [
  { name: 'Presencial', value: 'presencial' },
  { name: 'Online', value: 'online' },
];
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

async function findOptionId(
  queryInterface: QueryInterface,
  transaction: Transaction,
): Promise<number | string | null> {
  const rows = await queryInterface.sequelize.query<{ id: number | string }>(
    'SELECT id FROM system_options WHERE name = :name AND deleted_at IS NULL LIMIT 1',
    {
      replacements: { name: MODALITY_OPTION },
      transaction,
      type: QueryTypes.SELECT,
    },
  );

  return rows[0]?.id ?? null;
}

export async function up({ context: queryInterface }: MigrationContext): Promise<void> {
  await queryInterface.createTable(
    'availabilities',
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.BIGINT.UNSIGNED,
      },
      professor_id: {
        allowNull: false,
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        references: { key: 'id', model: 'users' },
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
      state: {
        allowNull: false,
        defaultValue: 'ativa',
        type: DataTypes.ENUM('ativa', 'bloqueada', 'cancelada'),
      },
      ...auditColumns(),
    },
    tableOptions,
  );

  await queryInterface.addConstraint('availabilities', {
    fields: ['ends_at', 'starts_at'],
    name: 'ck_availabilities_valid_interval',
    type: 'check',
    where: { ends_at: { [Op.gt]: col('starts_at') } },
  });
  await queryInterface.addIndex('availabilities', ['professor_id', 'starts_at', 'ends_at'], {
    name: 'ix_availabilities_professor_interval',
  });
  await queryInterface.addIndex('availabilities', ['professor_id', 'state', 'starts_at'], {
    name: 'ix_availabilities_professor_state_start',
  });

  await queryInterface.createTable(
    'availability_modalities',
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.BIGINT.UNSIGNED,
      },
      availability_id: {
        allowNull: false,
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        references: { key: 'id', model: 'availabilities' },
        type: DataTypes.BIGINT.UNSIGNED,
      },
      modality_option_item_id: {
        allowNull: false,
        comment: 'Item pertencente à opção APPOINTMENT_MODALITY',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        references: { key: 'id', model: 'system_option_items' },
        type: DataTypes.BIGINT.UNSIGNED,
      },
      ...auditColumns(),
    },
    tableOptions,
  );

  await queryInterface.addIndex(
    'availability_modalities',
    ['availability_id', 'modality_option_item_id'],
    { name: 'uq_availability_modalities_availability_item', unique: true },
  );
  await queryInterface.addIndex('availability_modalities', ['modality_option_item_id'], {
    name: 'ix_availability_modalities_item',
  });

  await queryInterface.sequelize.transaction(async (transaction) => {
    const now = new Date();
    const auditValues = {
      created_at: now,
      created_by: null,
      deleted_at: null,
      deleted_by: null,
      updated_at: now,
      updated_by: null,
    };

    await queryInterface.bulkInsert('system_options', [{ ...auditValues, name: MODALITY_OPTION }], {
      transaction,
    });
    const optionId = await findOptionId(queryInterface, transaction);

    if (!optionId) throw new Error('Não foi possível localizar a opção de modalidades.');

    await queryInterface.bulkInsert(
      'system_option_items',
      modalityItems.map((item) => ({ ...auditValues, ...item, option_id: optionId })),
      { transaction },
    );
  });
}

export async function down({ context: queryInterface }: MigrationContext): Promise<void> {
  await queryInterface.dropTable('availability_modalities');
  await queryInterface.dropTable('availabilities');

  await queryInterface.sequelize.transaction(async (transaction) => {
    const optionId = await findOptionId(queryInterface, transaction);

    if (!optionId) return;

    await queryInterface.bulkDelete(
      'system_option_items',
      { option_id: optionId },
      { transaction },
    );
    await queryInterface.bulkDelete('system_options', { id: optionId }, { transaction });
  });
}
