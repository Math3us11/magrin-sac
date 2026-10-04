import { Op, QueryTypes, type QueryInterface, type Transaction } from 'sequelize';
import {
  subjectGroupCourseCodes,
  subjectGroups,
  toSubjectCode,
} from './20261001020000-seed-initial-subjects.migration.js';

type MigrationContext = {
  context: QueryInterface;
};

type CatalogRow = {
  code: string;
  id: number;
};

const subjectCodes = [
  ...new Set(subjectGroups.flat().map((subjectName) => toSubjectCode(subjectName))),
];

async function loadCatalogIds(
  queryInterface: QueryInterface,
  tableName: 'courses' | 'subjects',
  codes: readonly string[],
  transaction: Transaction,
): Promise<Map<string, number>> {
  const rows = await queryInterface.sequelize.query<CatalogRow>(
    `SELECT id, code FROM ${tableName} WHERE code IN (:codes)`,
    {
      replacements: { codes },
      transaction,
      type: QueryTypes.SELECT,
    },
  );

  return new Map(rows.map(({ code, id }) => [code, id]));
}

export async function up({ context: queryInterface }: MigrationContext): Promise<void> {
  await queryInterface.sequelize.transaction(async (transaction) => {
    const courseIds = await loadCatalogIds(
      queryInterface,
      'courses',
      subjectGroupCourseCodes,
      transaction,
    );
    const subjectIds = await loadCatalogIds(queryInterface, 'subjects', subjectCodes, transaction);

    const missingCourses = subjectGroupCourseCodes.filter((code) => !courseIds.has(code));
    const missingSubjects = subjectCodes.filter((code) => !subjectIds.has(code));

    if (missingCourses.length > 0 || missingSubjects.length > 0) {
      throw new Error(
        `Catálogos incompletos para os vínculos iniciais: cursos=${missingCourses.join(',')}; matérias=${missingSubjects.join(',')}`,
      );
    }

    const now = new Date();
    const auditValues = {
      created_at: now,
      created_by: null,
      deleted_at: null,
      deleted_by: null,
      is_active: true,
      updated_at: now,
      updated_by: null,
    };

    const rows = subjectGroups.flatMap((group, index) => {
      const courseCode = subjectGroupCourseCodes[index];
      const courseId = courseCode ? courseIds.get(courseCode) : undefined;

      if (!courseId) {
        throw new Error(`Curso não encontrado para o grupo de matérias ${index}.`);
      }

      return [...new Set(group.map((subjectName) => toSubjectCode(subjectName)))].map(
        (subjectCode) => ({
          ...auditValues,
          course_id: courseId,
          subject_id: subjectIds.get(subjectCode),
        }),
      );
    });

    if (rows.some(({ subject_id: subjectId }) => !subjectId)) {
      throw new Error('Uma ou mais matérias não foram localizadas no catálogo.');
    }

    await queryInterface.bulkInsert('course_subjects', rows, { transaction });
  });
}

export async function down({ context: queryInterface }: MigrationContext): Promise<void> {
  await queryInterface.sequelize.transaction(async (transaction) => {
    const courseIds = await loadCatalogIds(
      queryInterface,
      'courses',
      subjectGroupCourseCodes,
      transaction,
    );
    const subjectIds = await loadCatalogIds(queryInterface, 'subjects', subjectCodes, transaction);

    for (const [index, group] of subjectGroups.entries()) {
      const courseCode = subjectGroupCourseCodes[index];
      const courseId = courseCode ? courseIds.get(courseCode) : undefined;
      const groupSubjectIds = [
        ...new Set(
          group
            .map((subjectName) => subjectIds.get(toSubjectCode(subjectName)))
            .filter((subjectId): subjectId is number => Boolean(subjectId)),
        ),
      ];

      if (!courseId || groupSubjectIds.length === 0) continue;

      await queryInterface.bulkDelete(
        'course_subjects',
        {
          course_id: courseId,
          subject_id: { [Op.in]: groupSubjectIds },
        },
        { transaction },
      );
    }
  });
}
