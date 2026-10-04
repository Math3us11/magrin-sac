import { Op, type QueryInterface } from 'sequelize';

type MigrationContext = {
  context: QueryInterface;
};

const graduationCourses = [
  ['administracao', 'Administração'],
  ['agronomia', 'Agronomia'],
  ['analise-desenvolvimento-sistemas', 'Análise e Desenvolvimento de Sistemas'],
  ['arquitetura-urbanismo', 'Arquitetura e Urbanismo'],
  ['biomedicina', 'Biomedicina'],
  ['ciencia-computacao', 'Ciência da Computação'],
  ['ciencias-contabeis', 'Ciências Contábeis'],
  ['ciencias-economicas', 'Ciências Econômicas'],
  ['direito', 'Direito'],
  ['enfermagem', 'Enfermagem'],
  ['engenharia-civil', 'Engenharia Civil'],
  ['farmacia', 'Farmácia'],
  ['fisioterapia', 'Fisioterapia'],
  ['fonoaudiologia', 'Fonoaudiologia'],
  ['gestao-ambiental', 'Gestão Ambiental'],
  ['gestao-comercial', 'Gestão Comercial'],
  ['gestao-financeira', 'Gestão Financeira'],
  ['gestao-recursos-humanos', 'Gestão de Recursos Humanos'],
  ['logistica', 'Logística'],
  ['marketing', 'Marketing'],
  ['medicina', 'Medicina'],
  ['medicina-veterinaria', 'Medicina Veterinária'],
  ['nutricao', 'Nutrição'],
  ['odontologia', 'Odontologia'],
  ['processos-gerenciais', 'Processos Gerenciais'],
  ['psicologia', 'Psicologia'],
  ['radiologia', 'Radiologia'],
  ['redes-computadores', 'Redes de Computadores'],
  ['teologia', 'Teologia'],
  ['terapia-ocupacional', 'Terapia Ocupacional'],
] as const;

const postgraduateCourses = [
  ['reproducao-animal', 'Reprodução Animal'],
  ['urgencia-emergencia-uti', 'Urgência, Emergência e Unidade de Terapia Intensiva (UTI)'],
] as const;

const courseCodes = [...graduationCourses, ...postgraduateCourses].map(([code]) => code);

export async function up({ context: queryInterface }: MigrationContext): Promise<void> {
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

    await queryInterface.bulkInsert(
      'courses',
      [
        ...graduationCourses.map(([code, name]) => ({
          ...auditValues,
          code,
          education_level: 'graduacao',
          is_active: true,
          name,
        })),
        ...postgraduateCourses.map(([code, name]) => ({
          ...auditValues,
          code,
          education_level: 'pos_graduacao',
          is_active: true,
          name,
        })),
      ],
      { transaction },
    );
  });
}

export async function down({ context: queryInterface }: MigrationContext): Promise<void> {
  await queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.bulkDelete('courses', { code: { [Op.in]: courseCodes } }, { transaction });
  });
}
