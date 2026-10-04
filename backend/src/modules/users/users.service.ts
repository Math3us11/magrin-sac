import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Op, UniqueConstraintError, type Transaction, type WhereOptions } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { PasswordHashService } from '../../helpers/password/password.service.js';
import { AuthSession } from '../../models/auth-session.model.js';
import { Course } from '../../models/course.model.js';
import { CourseSubject } from '../../models/course-subject.model.js';
import { Subject } from '../../models/subject.model.js';
import { SystemOptionItem } from '../../models/system-option-item.model.js';
import { SystemOption } from '../../models/system-option.model.js';
import { UserSubject } from '../../models/user-subject.model.js';
import { User, UserType } from '../../models/user.model.js';
import type { CreateUserDto } from './dto/create-user.dto.js';
import type { CreateUserResponseDto } from './dto/create-user-response.dto.js';
import type { ListUsersQueryDto } from './dto/list-users-query.dto.js';
import type { ListUsersResponseDto } from './dto/list-users-response.dto.js';
import type {
  RegistrationOptionsResponseDto,
  RegistrationSubjectsResponseDto,
} from './dto/registration-options-response.dto.js';
import type { UpdateUserDto } from './dto/update-user.dto.js';
import type {
  UpdateUserResponseDto,
  UserAcademicDetailsDto,
  UserDetailsResponseDto,
} from './dto/user-details-response.dto.js';

const ACADEMIC_PERIOD_OPTION = 'ACADEMIC_PERIOD';

type AcademicUserInput = Pick<CreateUserDto, 'academic' | 'userType'>;
type CreateUserInput = Omit<CreateUserDto, 'temporaryPassword'> & {
  temporaryPassword: string;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(Course) private readonly courseModel: typeof Course,
    @InjectModel(CourseSubject) private readonly courseSubjectModel: typeof CourseSubject,
    @InjectModel(Subject) private readonly subjectModel: typeof Subject,
    @InjectModel(SystemOption) private readonly systemOptionModel: typeof SystemOption,
    @InjectModel(SystemOptionItem)
    private readonly systemOptionItemModel: typeof SystemOptionItem,
    @InjectModel(User) private readonly userModel: typeof User,
    @InjectModel(UserSubject) private readonly userSubjectModel: typeof UserSubject,
    @InjectModel(AuthSession) private readonly authSessionModel: typeof AuthSession,
    @InjectConnection() private readonly sequelize: Sequelize,
    private readonly passwordHashService: PasswordHashService,
  ) {}

  async create(input: CreateUserInput, actorId: number): Promise<CreateUserResponseDto> {
    const passwordHash = await this.passwordHashService.hash(input.temporaryPassword);

    try {
      return await this.sequelize.transaction(async (transaction) => {
        await this.assertUniqueIdentity(input.email, input.cpf, transaction);
        const academicLinks = await this.validateAcademicLinks(input, transaction);
        const user = await this.userModel.unscoped().create(
          {
            birthDate: input.birthDate,
            cpf: input.cpf,
            createdBy: actorId,
            email: input.email,
            isActive: input.isActive,
            mustChangePassword: true,
            name: input.name,
            passwordHash,
            phone: input.phone,
            updatedBy: actorId,
            userType: input.userType,
          },
          { transaction },
        );

        if (academicLinks.length > 0) {
          await this.userSubjectModel.bulkCreate(
            academicLinks.map(({ courseSubjectId, periodOptionItemId }) => ({
              courseSubjectId,
              createdBy: actorId,
              isActive: true,
              periodOptionItemId,
              updatedBy: actorId,
              userId: user.id,
            })),
            { transaction },
          );
        }

        return { message: 'Usuário criado com sucesso.' };
      });
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        throw new ConflictException('Já existe um usuário com o e-mail ou CPF informado.');
      }

      throw error;
    }
  }

  async list(query: ListUsersQueryDto): Promise<ListUsersResponseDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: WhereOptions = {};

    if (query.search) {
      const search = this.escapeLikeValue(query.search);
      Object.assign(where, {
        [Op.or]: [{ name: { [Op.like]: `%${search}%` } }, { email: { [Op.like]: `%${search}%` } }],
      });
    }

    if (query.userType) where.userType = query.userType;
    if (query.isActive !== undefined) where.isActive = query.isActive;

    const { count, rows } = await this.userModel.findAndCountAll({
      attributes: [
        'createdAt',
        'email',
        'id',
        'isActive',
        'mustChangePassword',
        'name',
        'userType',
      ],
      limit: pageSize,
      offset: (page - 1) * pageSize,
      order: [
        ['name', 'ASC'],
        ['id', 'ASC'],
      ],
      where,
    });

    return {
      page,
      pageSize,
      total: count,
      users: rows.map(({ createdAt, email, id, isActive, mustChangePassword, name, userType }) => ({
        createdAt,
        email,
        id,
        isActive,
        mustChangePassword,
        name,
        userType,
      })),
    };
  }

  async getById(userId: number): Promise<UserDetailsResponseDto> {
    const user = await this.userModel.unscoped().findByPk(userId, {
      attributes: [
        'birthDate',
        'cpf',
        'createdAt',
        'email',
        'id',
        'isActive',
        'mustChangePassword',
        'name',
        'phone',
        'updatedAt',
        'userType',
      ],
    });

    if (!user) throw new NotFoundException('Usuário não encontrado.');

    return {
      academic:
        user.userType === UserType.ADMINISTRATOR
          ? null
          : await this.getUserAcademicDetails(user.id),
      birthDate: user.birthDate,
      cpf: user.cpf,
      createdAt: user.createdAt,
      email: user.email,
      id: user.id,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
      name: user.name,
      phone: user.phone,
      updatedAt: user.updatedAt,
      userType: user.userType,
    };
  }

  async update(
    userId: number,
    input: UpdateUserDto,
    actorId: number,
  ): Promise<UpdateUserResponseDto> {
    try {
      return await this.sequelize.transaction(async (transaction) => {
        const user = await this.userModel.unscoped().findByPk(userId, { transaction });

        if (!user) throw new NotFoundException('Usuário não encontrado.');

        await this.assertUniqueIdentity(input.email, input.cpf, transaction, userId);
        const academicLinks = await this.validateAcademicLinks(input, transaction);

        await user.update(
          {
            birthDate: input.birthDate,
            cpf: input.cpf,
            email: input.email,
            isActive: input.isActive,
            name: input.name,
            phone: input.phone,
            updatedBy: actorId,
            userType: input.userType,
          },
          { transaction },
        );
        await this.syncAcademicLinks(userId, academicLinks, actorId, transaction);

        return { message: 'Usuário atualizado com sucesso.' };
      });
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        throw new ConflictException('Já existe um usuário com o e-mail ou CPF informado.');
      }

      throw error;
    }
  }

  async delete(
    userId: number,
    actorId: number,
    confirmationPassword: string,
  ): Promise<{ message: string }> {
    const actor = await this.userModel.unscoped().findByPk(actorId, {
      attributes: ['id', 'isActive', 'passwordHash'],
    });
    const passwordMatches = await this.passwordHashService.matches(
      confirmationPassword,
      actor?.passwordHash,
    );

    if (!actor?.isActive || !passwordMatches) {
      throw new ForbiddenException('Senha de confirmação inválida.');
    }
    if (userId === actorId) {
      throw new ForbiddenException('Você não pode excluir a própria conta.');
    }

    return this.sequelize.transaction(async (transaction) => {
      const user = await this.userModel.unscoped().findByPk(userId, { transaction });

      if (!user) throw new NotFoundException('Usuário não encontrado.');

      const now = new Date();
      await user.update(
        { deletedBy: actorId, isActive: false, updatedBy: actorId },
        { fields: ['deletedBy', 'isActive', 'updatedBy'], transaction },
      );
      await this.authSessionModel.update(
        { revokedAt: now, updatedBy: actorId },
        { transaction, where: { revokedAt: null, userId } },
      );
      await user.destroy({ transaction });

      return { message: 'Usuário excluído com sucesso.' };
    });
  }

  private escapeLikeValue(value: string): string {
    return value.replace(/[\\%_]/g, (character) => `\\${character}`);
  }

  async getRegistrationOptions(): Promise<RegistrationOptionsResponseDto> {
    const [courses, academicPeriodOption] = await Promise.all([
      this.courseModel.findAll({
        attributes: ['code', 'educationLevel', 'id', 'name'],
        order: [
          ['educationLevel', 'ASC'],
          ['name', 'ASC'],
        ],
        where: { isActive: true },
      }),
      this.systemOptionModel.findOne({
        attributes: ['id'],
        where: { name: ACADEMIC_PERIOD_OPTION },
      }),
    ]);

    if (!academicPeriodOption) {
      throw new InternalServerErrorException('Catálogo de períodos acadêmicos indisponível.');
    }

    const academicPeriods = await this.systemOptionItemModel.findAll({
      attributes: ['id', 'name', 'value'],
      where: { optionId: academicPeriodOption.id },
    });

    academicPeriods.sort((left, right) => Number(left.value) - Number(right.value));

    return {
      academicPeriods: academicPeriods.map(({ id, name, value }) => ({ id, name, value })),
      courses: courses.map(({ code, educationLevel, id, name }) => ({
        code,
        educationLevel,
        id,
        name,
      })),
    };
  }

  async getRegistrationSubjects(courseIds: number[]): Promise<RegistrationSubjectsResponseDto> {
    const uniqueCourseIds = [...new Set(courseIds)];
    const courses = await this.courseModel.findAll({
      attributes: ['id', 'name'],
      where: { id: { [Op.in]: uniqueCourseIds }, isActive: true },
    });
    const activeCourseIds = courses.map(({ id }) => id);

    if (activeCourseIds.length === 0) return { subjects: [] };

    const courseSubjects = await this.courseSubjectModel.findAll({
      attributes: ['courseId', 'id', 'subjectId'],
      where: { courseId: { [Op.in]: activeCourseIds }, isActive: true },
    });
    const subjectIds = [...new Set(courseSubjects.map(({ subjectId }) => subjectId))];

    if (subjectIds.length === 0) return { subjects: [] };

    const subjects = await this.subjectModel.findAll({
      attributes: ['code', 'id', 'name'],
      where: { id: { [Op.in]: subjectIds }, isActive: true },
    });
    const courseNames = new Map(courses.map(({ id, name }) => [id, name]));
    const subjectsById = new Map(subjects.map((subject) => [subject.id, subject]));

    const options = courseSubjects.flatMap((courseSubject) => {
      const courseName = courseNames.get(courseSubject.courseId);
      const subject = subjectsById.get(courseSubject.subjectId);

      if (!courseName || !subject) return [];

      return [
        {
          courseId: courseSubject.courseId,
          courseName,
          courseSubjectId: courseSubject.id,
          subjectCode: subject.code,
          subjectId: subject.id,
          subjectName: subject.name,
        },
      ];
    });

    options.sort(
      (left, right) =>
        left.courseName.localeCompare(right.courseName, 'pt-BR') ||
        left.subjectName.localeCompare(right.subjectName, 'pt-BR'),
    );

    return { subjects: options };
  }

  private async getUserAcademicDetails(userId: number): Promise<UserAcademicDetailsDto> {
    const userSubjects = await this.userSubjectModel.findAll({
      attributes: ['courseSubjectId', 'periodOptionItemId'],
      where: { isActive: true, userId },
    });
    const courseSubjectIds = [
      ...new Set(userSubjects.map(({ courseSubjectId }) => courseSubjectId)),
    ];
    const courseSubjects =
      courseSubjectIds.length > 0
        ? await this.courseSubjectModel.findAll({
            attributes: ['courseId', 'id', 'subjectId'],
            where: { id: { [Op.in]: courseSubjectIds } },
          })
        : [];
    const courseIds = [...new Set(courseSubjects.map(({ courseId }) => courseId))];
    const subjectIds = [...new Set(courseSubjects.map(({ subjectId }) => subjectId))];
    const periodId = userSubjects.find(
      ({ periodOptionItemId }) => periodOptionItemId !== null,
    )?.periodOptionItemId;
    const [courses, subjects, academicPeriod] = await Promise.all([
      courseIds.length > 0
        ? this.courseModel.findAll({
            attributes: ['id', 'name'],
            where: { id: { [Op.in]: courseIds } },
          })
        : [],
      subjectIds.length > 0
        ? this.subjectModel.findAll({
            attributes: ['id', 'name'],
            where: { id: { [Op.in]: subjectIds } },
          })
        : [],
      periodId
        ? this.systemOptionItemModel.findByPk(periodId, {
            attributes: ['id', 'name', 'value'],
          })
        : null,
    ]);
    const courseNames = new Map(courses.map(({ id, name }) => [id, name]));
    const subjectsById = new Map(subjects.map(({ id, name }) => [id, { id, name }]));
    const academicSubjects = courseSubjects.flatMap(({ courseId, id, subjectId }) => {
      const courseName = courseNames.get(courseId);
      const subject = subjectsById.get(subjectId);

      if (!courseName || !subject) return [];

      return [
        {
          courseId,
          courseName,
          courseSubjectId: id,
          subjectId,
          subjectName: subject.name,
        },
      ];
    });

    academicSubjects.sort(
      (left, right) =>
        left.courseName.localeCompare(right.courseName, 'pt-BR') ||
        left.subjectName.localeCompare(right.subjectName, 'pt-BR'),
    );

    return {
      academicPeriod: academicPeriod
        ? { id: academicPeriod.id, name: academicPeriod.name, value: academicPeriod.value }
        : null,
      courseIds,
      courses: courses
        .map(({ id, name }) => ({ id, name }))
        .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR')),
      courseSubjectIds,
      subjects: academicSubjects,
    };
  }

  private async syncAcademicLinks(
    userId: number,
    desiredLinks: Array<{ courseSubjectId: number; periodOptionItemId: number | null }>,
    actorId: number,
    transaction: Transaction,
  ): Promise<void> {
    const existingLinks = await this.userSubjectModel.unscoped().findAll({
      paranoid: false,
      transaction,
      where: { userId },
    });
    const desiredByKey = new Map(
      desiredLinks.map((link) => [this.academicLinkKey(link), link] as const),
    );
    const retainedKeys = new Set<string>();

    for (const existingLink of existingLinks) {
      const key = this.academicLinkKey(existingLink);
      const shouldRetain = desiredByKey.has(key) && !retainedKeys.has(key);

      if (shouldRetain) {
        retainedKeys.add(key);
        await existingLink.update(
          {
            deletedAt: null,
            deletedBy: null,
            isActive: true,
            updatedBy: actorId,
          },
          { transaction },
        );
      } else if (existingLink.isActive) {
        await existingLink.update({ isActive: false, updatedBy: actorId }, { transaction });
      }
    }

    const newLinks = desiredLinks.filter((link) => !retainedKeys.has(this.academicLinkKey(link)));

    if (newLinks.length > 0) {
      await this.userSubjectModel.bulkCreate(
        newLinks.map(({ courseSubjectId, periodOptionItemId }) => ({
          courseSubjectId,
          createdBy: actorId,
          isActive: true,
          periodOptionItemId,
          updatedBy: actorId,
          userId,
        })),
        { transaction },
      );
    }
  }

  private academicLinkKey(link: {
    courseSubjectId: number;
    periodOptionItemId: number | null;
  }): string {
    return `${link.courseSubjectId}:${link.periodOptionItemId ?? 'none'}`;
  }

  private async assertUniqueIdentity(
    email: string,
    cpf: string,
    transaction: Transaction,
    excludedUserId?: number,
  ): Promise<void> {
    const where: WhereOptions = { [Op.or]: [{ email }, { cpf }] };
    if (excludedUserId !== undefined) Object.assign(where, { id: { [Op.ne]: excludedUserId } });

    const existingUser = await this.userModel.unscoped().findOne({
      attributes: ['id'],
      paranoid: false,
      transaction,
      where,
    });

    if (existingUser) {
      throw new ConflictException('Já existe um usuário com o e-mail ou CPF informado.');
    }
  }

  private async validateAcademicLinks(
    input: AcademicUserInput,
    transaction: Transaction,
  ): Promise<Array<{ courseSubjectId: number; periodOptionItemId: number | null }>> {
    if (input.userType === UserType.ADMINISTRATOR) {
      if (input.academic) {
        throw new BadRequestException('Administrador não deve possuir vínculo acadêmico inicial.');
      }

      return [];
    }

    if (!input.academic) {
      throw new BadRequestException('Informe o vínculo acadêmico do usuário.');
    }

    if (input.userType === UserType.STUDENT && input.academic.courseIds.length !== 1) {
      throw new BadRequestException('Aluno deve possuir somente um curso neste cadastro.');
    }

    if (input.userType === UserType.PROFESSOR && input.academic.academicPeriodId !== undefined) {
      throw new BadRequestException('Professor não deve possuir período acadêmico inicial.');
    }

    const courses = await this.courseModel.findAll({
      attributes: ['id'],
      transaction,
      where: { id: { [Op.in]: input.academic.courseIds }, isActive: true },
    });

    if (courses.length !== input.academic.courseIds.length) {
      throw new BadRequestException('Um ou mais cursos selecionados são inválidos ou inativos.');
    }

    const courseSubjects = await this.courseSubjectModel.findAll({
      attributes: ['courseId', 'id', 'subjectId'],
      transaction,
      where: { id: { [Op.in]: input.academic.courseSubjectIds }, isActive: true },
    });

    if (courseSubjects.length !== input.academic.courseSubjectIds.length) {
      throw new BadRequestException('Uma ou mais matérias selecionadas são inválidas ou inativas.');
    }

    const selectedCourseIds = new Set(input.academic.courseIds);
    const linkedCourseIds = new Set<number>();

    for (const courseSubject of courseSubjects) {
      if (!selectedCourseIds.has(courseSubject.courseId)) {
        throw new BadRequestException(
          'Uma matéria selecionada não pertence aos cursos informados.',
        );
      }

      linkedCourseIds.add(courseSubject.courseId);
    }

    if (linkedCourseIds.size !== selectedCourseIds.size) {
      throw new BadRequestException('Selecione ao menos uma matéria para cada curso informado.');
    }

    const subjectIds = [...new Set(courseSubjects.map(({ subjectId }) => subjectId))];
    const activeSubjects = await this.subjectModel.count({
      transaction,
      where: { id: { [Op.in]: subjectIds }, isActive: true },
    });

    if (activeSubjects !== subjectIds.length) {
      throw new BadRequestException('Uma ou mais matérias selecionadas estão inativas.');
    }

    const periodOptionItemId = await this.resolveAcademicPeriod(input, transaction);

    return courseSubjects.map(({ id }) => ({
      courseSubjectId: id,
      periodOptionItemId,
    }));
  }

  private async resolveAcademicPeriod(
    input: AcademicUserInput,
    transaction: Transaction,
  ): Promise<number | null> {
    if (input.userType === UserType.PROFESSOR) return null;

    const academicPeriodId = input.academic?.academicPeriodId;

    if (!academicPeriodId) {
      throw new BadRequestException('Informe o período acadêmico atual do aluno.');
    }

    const academicPeriodOption = await this.systemOptionModel.findOne({
      attributes: ['id'],
      transaction,
      where: { name: ACADEMIC_PERIOD_OPTION },
    });

    if (!academicPeriodOption) {
      throw new InternalServerErrorException('Catálogo de períodos acadêmicos indisponível.');
    }

    const academicPeriod = await this.systemOptionItemModel.findOne({
      attributes: ['id'],
      transaction,
      where: { id: academicPeriodId, optionId: academicPeriodOption.id },
    });

    if (!academicPeriod) {
      throw new BadRequestException('O período acadêmico informado é inválido.');
    }

    return academicPeriod.id;
  }
}
