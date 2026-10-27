import { DataTypes, type QueryInterface } from 'sequelize';

type MigrationContext = {
  context: QueryInterface;
};

export async function up({ context: queryInterface }: MigrationContext): Promise<void> {
  await queryInterface.addColumn('users', 'registration_number', {
    allowNull: true,
    comment: 'Matrícula do aluno, somente dígitos; nula para professor e administrador',
    type: DataTypes.STRING(20),
  });
  // A unicidade inclui contas excluídas logicamente, como e-mail e CPF (ADR-018).
  await queryInterface.addIndex('users', ['registration_number'], {
    name: 'uq_users_registration_number',
    unique: true,
  });
  await queryInterface.sequelize.query(`
    ALTER TABLE users
      ADD CONSTRAINT ck_users_registration_number_digits
        CHECK (registration_number IS NULL OR registration_number REGEXP '^[0-9]{1,20}$'),
      ADD CONSTRAINT ck_users_registration_number_student
        CHECK (registration_number IS NULL OR user_type = 'aluno')
  `);
}

export async function down({ context: queryInterface }: MigrationContext): Promise<void> {
  // Uma única instrução: o removeColumn do Sequelize falha no MariaDB 12 e deixaria o rollback
  // pela metade.
  await queryInterface.sequelize.query(`
    ALTER TABLE users
      DROP CONSTRAINT ck_users_registration_number_student,
      DROP CONSTRAINT ck_users_registration_number_digits,
      DROP INDEX uq_users_registration_number,
      DROP COLUMN registration_number
  `);
}
