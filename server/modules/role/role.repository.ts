import type { Permission, PrismaClient, Role } from '#generated/client/client.ts'
import type { AppContext } from '#server/context/app-context.ts'
import type { ILogger } from '#server/infrastructure/logging/index.ts'
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSIONS,
  SYSTEM_ROLE_NAMES,
  type PermissionKey,
} from './role.permissions.ts'

export interface RoleWithPermissions extends Role {
  permissions: Array<{
    permission: Permission
  }>
}

export interface IRoleRepository {
  ensureDefaults(): Promise<void>
  findMany(): Promise<RoleWithPermissions[]>
  findPermissions(): Promise<Permission[]>
  findById(id: string): Promise<RoleWithPermissions | null>
  findByName(name: string): Promise<RoleWithPermissions | null>
  countUsersWithRole(roleName: string): Promise<number>
  create(data: { name: string; description?: string | null }): Promise<RoleWithPermissions>
  update(id: string, data: { name?: string; description?: string | null }): Promise<RoleWithPermissions>
  delete(id: string): Promise<Role>
  setPermissions(roleId: string, permissionKeys: PermissionKey[]): Promise<RoleWithPermissions>
}

export class PrismaRoleRepository implements IRoleRepository {
  private logger: ILogger

  constructor(
    appContext: AppContext,
    private prisma: PrismaClient,
  ) {
    this.logger = appContext.logger
  }

  async ensureDefaults(): Promise<void> {
    this.logger.debug('PrismaRoleRepository.ensureDefaults')

    for (const permission of PERMISSIONS) {
      await this.prisma.permission.upsert({
        where: { key: permission.key },
        update: {
          label: permission.label,
          description: permission.description,
          group: permission.group,
        },
        create: permission,
      })
    }

    for (const roleName of Object.values(SYSTEM_ROLE_NAMES)) {
      const role = await this.prisma.role.upsert({
        where: { name: roleName },
        update: { system: true },
        create: {
          name: roleName,
          system: true,
          description: roleName === SYSTEM_ROLE_NAMES.ADMIN
            ? 'Full administrator access.'
            : 'Default role for regular signed-in users.',
        },
        include: { permissions: true },
      })

      if (role.permissions.length === 0) {
        await this.setPermissions(role.id, DEFAULT_ROLE_PERMISSIONS[roleName])
      }
    }
  }

  findMany(): Promise<RoleWithPermissions[]> {
    this.logger.debug('PrismaRoleRepository.findMany')
    return this.prisma.role.findMany({
      include: { permissions: { include: { permission: true } } },
      orderBy: [{ system: 'desc' }, { name: 'asc' }],
    })
  }

  findPermissions(): Promise<Permission[]> {
    this.logger.debug('PrismaRoleRepository.findPermissions')
    return this.prisma.permission.findMany({
      orderBy: [{ group: 'asc' }, { label: 'asc' }],
    })
  }

  findById(id: string): Promise<RoleWithPermissions | null> {
    this.logger.debug('PrismaRoleRepository.findById', { id })
    return this.prisma.role.findUnique({
      where: { id },
      include: { permissions: { include: { permission: true } } },
    })
  }

  findByName(name: string): Promise<RoleWithPermissions | null> {
    this.logger.debug('PrismaRoleRepository.findByName', { name })
    return this.prisma.role.findUnique({
      where: { name },
      include: { permissions: { include: { permission: true } } },
    })
  }

  countUsersWithRole(roleName: string): Promise<number> {
    this.logger.debug('PrismaRoleRepository.countUsersWithRole', { roleName })
    return this.prisma.user.count({ where: { role: roleName } })
  }

  async create(data: { name: string; description?: string | null }): Promise<RoleWithPermissions> {
    this.logger.info('PrismaRoleRepository.create', { name: data.name })
    const role = await this.prisma.role.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        system: false,
      },
    })
    return this.findById(role.id) as Promise<RoleWithPermissions>
  }

  async update(id: string, data: { name?: string; description?: string | null }): Promise<RoleWithPermissions> {
    this.logger.info('PrismaRoleRepository.update', { id })
    await this.prisma.role.update({
      where: { id },
      data,
    })
    return this.findById(id) as Promise<RoleWithPermissions>
  }

  delete(id: string): Promise<Role> {
    this.logger.info('PrismaRoleRepository.delete', { id })
    return this.prisma.role.delete({ where: { id } })
  }

  async setPermissions(roleId: string, permissionKeys: PermissionKey[]): Promise<RoleWithPermissions> {
    this.logger.info('PrismaRoleRepository.setPermissions', { roleId, permissionKeys })

    const permissions = await this.prisma.permission.findMany({
      where: { key: { in: [...new Set(permissionKeys)] } },
      select: { id: true },
    })

    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId } }),
      ...permissions.map((permission) =>
        this.prisma.rolePermission.create({
          data: {
            roleId,
            permissionId: permission.id,
          },
        }),
      ),
    ])

    return this.findById(roleId) as Promise<RoleWithPermissions>
  }
}
