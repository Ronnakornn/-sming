import type { Permission } from '#generated/client/client.ts'
import type { AppContext } from '#server/context/app-context.ts'
import type { ILogger } from '#server/infrastructure/logging/index.ts'
import { RoleServiceError } from './role.errors.ts'
import type { IRoleRepository, RoleWithPermissions } from './role.repository.ts'
import { PERMISSIONS, SYSTEM_ROLE_NAMES, type PermissionKey } from './role.permissions.ts'

export interface RoleResponse {
  id: string
  name: string
  description: string | null
  system: boolean
  createdAt: Date
  updatedAt: Date
  permissions: PermissionResponse[]
}

export interface PermissionResponse {
  id: string
  key: string
  label: string
  description: string
  group: string
}

export class RoleService {
  private logger: ILogger

  constructor(
    appContext: AppContext,
    private repo: IRoleRepository,
  ) {
    this.logger = appContext.logger
  }

  async listRoles(): Promise<RoleResponse[]> {
    this.logger.debug('RoleService.listRoles')
    await this.repo.ensureDefaults()
    const roles = await this.repo.findMany()
    return roles.map((role) => this.toRoleResponse(role))
  }

  async listPermissions(): Promise<PermissionResponse[]> {
    this.logger.debug('RoleService.listPermissions')
    await this.repo.ensureDefaults()
    const permissions = await this.repo.findPermissions()
    return permissions.map((permission) => this.toPermissionResponse(permission))
  }

  async createRole(data: { name: string; description?: string | null }): Promise<RoleResponse> {
    this.logger.info('RoleService.createRole', { name: data.name })
    await this.repo.ensureDefaults()
    const name = this.normalizeRoleName(data.name)
    this.assertEditableRoleName(name)

    const existing = await this.repo.findByName(name)
    if (existing) {
      throw new RoleServiceError('Role name is already in use', 409)
    }

    const role = await this.repo.create({
      name,
      description: data.description?.trim() || null,
    })

    return this.toRoleResponse(role)
  }

  async updateRole(id: string, data: { name: string; description?: string | null }): Promise<RoleResponse> {
    this.logger.info('RoleService.updateRole', { id })
    await this.repo.ensureDefaults()
    const role = await this.requireRole(id)
    const name = this.normalizeRoleName(data.name)

    if (role.system && role.name !== name) {
      throw new RoleServiceError('System role names cannot be changed', 400)
    }

    if (!role.system) {
      this.assertEditableRoleName(name)
      const existing = await this.repo.findByName(name)
      if (existing && existing.id !== id) {
        throw new RoleServiceError('Role name is already in use', 409)
      }
    }

    const updated = await this.repo.update(id, {
      name: role.system ? undefined : name,
      description: data.description?.trim() || null,
    })

    return this.toRoleResponse(updated)
  }

  async setPermissions(id: string, permissionKeys: string[]): Promise<RoleResponse> {
    this.logger.info('RoleService.setPermissions', { id, permissionKeys })
    await this.repo.ensureDefaults()
    const role = await this.requireRole(id)
    const keys = this.normalizePermissionKeys(permissionKeys)

    if (role.name === SYSTEM_ROLE_NAMES.ADMIN && (!keys.includes('admin.access') || !keys.includes('admin.roles'))) {
      throw new RoleServiceError('ADMIN must keep admin access and role permissions', 400)
    }

    const updated = await this.repo.setPermissions(id, keys)
    return this.toRoleResponse(updated)
  }

  async deleteRole(id: string): Promise<void> {
    this.logger.info('RoleService.deleteRole', { id })
    await this.repo.ensureDefaults()
    const role = await this.requireRole(id)

    if (role.system) {
      throw new RoleServiceError('System roles cannot be deleted', 400)
    }

    const assignedUserCount = await this.repo.countUsersWithRole(role.name)
    if (assignedUserCount > 0) {
      throw new RoleServiceError('Role is assigned to users and cannot be deleted', 400)
    }

    await this.repo.delete(id)
  }

  private async requireRole(id: string): Promise<RoleWithPermissions> {
    const role = await this.repo.findById(id)
    if (!role) throw new RoleServiceError('Role not found', 404)
    return role
  }

  private normalizeRoleName(name: string): string {
    const normalized = name.trim().toUpperCase().replaceAll(/\s+/g, '_')
    if (!normalized) throw new RoleServiceError('Role name is required', 400)
    if (!/^[A-Z][A-Z0-9_]{1,31}$/.test(normalized)) {
      throw new RoleServiceError('Role name must use 2-32 uppercase letters, numbers, or underscores', 400)
    }
    return normalized
  }

  private assertEditableRoleName(name: string): void {
    if (name === SYSTEM_ROLE_NAMES.USER || name === SYSTEM_ROLE_NAMES.ADMIN) {
      throw new RoleServiceError('Use a different name for custom roles', 400)
    }
  }

  private normalizePermissionKeys(permissionKeys: string[]): PermissionKey[] {
    const allowedKeys = new Set(PERMISSIONS.map((permission) => permission.key))
    const uniqueKeys = [...new Set(permissionKeys)]
    const invalidKey = uniqueKeys.find((key) => !allowedKeys.has(key as PermissionKey))
    if (invalidKey) throw new RoleServiceError(`Invalid permission: ${invalidKey}`, 400)
    return uniqueKeys as PermissionKey[]
  }

  private toRoleResponse(role: RoleWithPermissions): RoleResponse {
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      system: role.system,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions: role.permissions.map(({ permission }) => this.toPermissionResponse(permission)),
    }
  }

  private toPermissionResponse(permission: Permission): PermissionResponse {
    return {
      id: permission.id,
      key: permission.key,
      label: permission.label,
      description: permission.description,
      group: permission.group,
    }
  }
}
