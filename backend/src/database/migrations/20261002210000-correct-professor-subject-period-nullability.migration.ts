import type { QueryInterface } from 'sequelize';

type MigrationContext = {
  context: QueryInterface;
};

export async function up({ context: queryInterface }: MigrationContext): Promise<void> {
  await queryInterface.sequelize.query(`
    ALTER TABLE user_subjects
    MODIFY COLUMN period_option_item_id BIGINT UNSIGNED NULL
    COMMENT 'Obrigatório para aluno e ausente para professor'
  `);
}

export async function down({ context: queryInterface }: MigrationContext): Promise<void> {
  await queryInterface.sequelize.query(`
    ALTER TABLE user_subjects
    MODIFY COLUMN period_option_item_id BIGINT UNSIGNED NOT NULL
    COMMENT 'Item pertencente à opção ACADEMIC_PERIOD'
  `);
}
