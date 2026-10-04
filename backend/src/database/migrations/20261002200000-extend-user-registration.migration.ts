import { DataTypes, type QueryInterface } from 'sequelize';

type MigrationContext = {
  context: QueryInterface;
};

export async function up({ context: queryInterface }: MigrationContext): Promise<void> {
  await queryInterface.addColumn('users', 'phone', {
    allowNull: true,
    comment: 'Telefone normalizado com DDD e somente dígitos',
    type: DataTypes.STRING(11),
  });
  await queryInterface.addColumn('users', 'must_change_password', {
    allowNull: false,
    defaultValue: false,
    type: DataTypes.BOOLEAN,
  });
  await queryInterface.changeColumn('user_subjects', 'period_option_item_id', {
    allowNull: true,
    comment: 'Obrigatório para aluno e ausente para professor',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
    references: { key: 'id', model: 'system_option_items' },
    type: DataTypes.BIGINT.UNSIGNED,
  });
}

export async function down({ context: queryInterface }: MigrationContext): Promise<void> {
  await queryInterface.changeColumn('user_subjects', 'period_option_item_id', {
    allowNull: false,
    comment: 'Item pertencente à opção ACADEMIC_PERIOD',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
    references: { key: 'id', model: 'system_option_items' },
    type: DataTypes.BIGINT.UNSIGNED,
  });
  await queryInterface.removeColumn('users', 'must_change_password');
  await queryInterface.removeColumn('users', 'phone');
}
