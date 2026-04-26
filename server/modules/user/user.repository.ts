import type { PrismaClient, User } from '#generated/client/client.ts'
import type { AppContext } from '#server/context/app-context.ts'
import type { ILogger } from '#server/infrastructure/logging/index.ts'
import { DEFAULT_ROLE_PERMISSIONS, SYSTEM_ROLE_NAMES, type PermissionKey } from '#server/modules/role/role.permissions.ts'

export type AdminUserListItem = Pick<
  User,
  'id' | 'name' | 'email' | 'role' | 'createdAt' | 'updatedAt'
>

export interface UpdateAdminUserData {
  name?: string
  email?: string
  role?: string
}

export interface IUserRepository {
  findManyForAdmin(): Promise<AdminUserListItem[]>
  findById(id: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  countAdmins(excludeUserId?: string): Promise<number>
  countUsersWithPermission(permissionKey: PermissionKey, excludeUserId?: string): Promise<number>
  roleExists(roleName: string): Promise<boolean>
  roleHasPermission(roleName: string, permissionKey: PermissionKey): Promise<boolean>
  updateUser(id: string, data: UpdateAdminUserData): Promise<User>
  delete(id: string): Promise<User>
  promoteByEmails(emails: string[]): Promise<number>
}

export class PrismaUserRepository implements IUserRepository {
  private logger: ILogger

  constructor(
    appContext: AppContext,
    private prisma: PrismaClient,
  ) {
    this.logger = appContext.logger
  }

  findManyForAdmin(): Promise<AdminUserListItem[]> {
    this.logger.debug('PrismaUserRepository.findManyForAdmin')
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  findById(id: string): Promise<User | null> {
    this.logger.debug('PrismaUserRepository.findById', { id })
    return this.prisma.user.findUnique({ where: { id } })
  }

  findByEmail(email: string): Promise<User | null> {
    this.logger.debug('PrismaUserRepository.findByEmail', { email })
    return this.prisma.user.findUnique({ where: { email } })
  }

  countAdmins(excludeUserId?: string): Promise<number> {
    this.logger.debug('PrismaUserRepository.countAdmins', { excludeUserId })
    return this.prisma.user.count({
      where: {
        role: 'ADMIN',
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
    })
  }

  async countUsersWithPermission(permissionKey: PermissionKey, excludeUserId?: string): Promise<number> {
    this.logger.debug('PrismaUserRepository.countUsersWithPermission', { permissionKey, excludeUserId })
    const roles = await this.prisma.role.findMany({
      where: {
        permissions: {
          some: { permission: { key: permissionKey } },
        },
      },
      select: { name: true },
    })

    return this.prisma.user.count({
      where: {
        role: { in: roles.map((role) => role.name) },
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
    })
  }

  async roleExists(roleName: string): Promise<boolean> {
    this.logger.debug('PrismaUserRepository.roleExists', { roleName })
    if (roleName === SYSTEM_ROLE_NAMES.USER || roleName === SYSTEM_ROLE_NAMES.ADMIN) return true
    const count = await this.prisma.role.count({ where: { name: roleName } })
    return count > 0
  }

  async roleHasPermission(roleName: string, permissionKey: PermissionKey): Promise<boolean> {
    this.logger.debug('PrismaUserRepository.roleHasPermission', { roleName, permissionKey })
    const count = await this.prisma.rolePermission.count({
      where: {
        role: { name: roleName },
        permission: { key: permissionKey },
      },
    })
    if (count === 0 && (roleName === SYSTEM_ROLE_NAMES.USER || roleName === SYSTEM_ROLE_NAMES.ADMIN)) {
      const roleExists = await this.prisma.role.count({ where: { name: roleName } })
      if (roleExists === 0) return DEFAULT_ROLE_PERMISSIONS[roleName].includes(permissionKey)
    }
    return count > 0
  }

  updateUser(id: string, data: UpdateAdminUserData): Promise<User> {
    this.logger.info('PrismaUserRepository.updateUser', { id, data })
    return this.prisma.user.update({
      where: { id },
      data,
    })
  }

  delete(id: string): Promise<User> {
    this.logger.info('PrismaUserRepository.delete', { id })
    return this.prisma.user.delete({ where: { id } })
  }

  async promoteByEmails(emails: string[]): Promise<number> {
    this.logger.info('PrismaUserRepository.promoteByEmails', { count: emails.length })
    if (emails.length === 0) return 0
    const result = await this.prisma.user.updateMany({
      where: { email: { in: emails } },
      data: { role: 'ADMIN' },
    })
    return result.count
  }
}
