export { createRoleRoutes } from './role.routes.ts'
export { PrismaRoleRepository } from './role.repository.ts'
export { RoleService } from './role.service.ts'
export {
  DEFAULT_ROLE_PERMISSIONS,
  getUserRolePermissionKeys,
  PERMISSIONS,
  SYSTEM_ROLE_NAMES,
  userRoleHasPermission,
  type PermissionKey,
} from './role.permissions.ts'
