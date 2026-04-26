import type { PrismaClient } from '#generated/client/client.ts'

export const PERMISSIONS = [
  {
    key: 'admin.access',
    label: 'Admin access',
    description: 'Enter the protected admin area.',
    group: 'Admin',
  },
  {
    key: 'admin.dashboard',
    label: 'Admin dashboard',
    description: 'View admin overview metrics and navigation.',
    group: 'Admin',
  },
  {
    key: 'admin.users',
    label: 'User management',
    description: 'Create users, edit accounts, assign roles, and remove access.',
    group: 'Users',
  },
  {
    key: 'admin.roles',
    label: 'Role permissions',
    description: 'Create roles and manage permission assignments.',
    group: 'Access',
  },
  {
    key: 'admin.todos',
    label: 'Admin todo workspace',
    description: 'Open the todo workspace from the admin area.',
    group: 'Tasks',
  },
  {
    key: 'admin.profile',
    label: 'Admin profile',
    description: 'Review the current administrator profile and session.',
    group: 'Account',
  },
] as const

export type PermissionKey = (typeof PERMISSIONS)[number]['key']

export const SYSTEM_ROLE_NAMES = {
  USER: 'USER',
  ADMIN: 'ADMIN',
} as const

export type SystemRoleName = (typeof SYSTEM_ROLE_NAMES)[keyof typeof SYSTEM_ROLE_NAMES]

export const DEFAULT_ROLE_PERMISSIONS: Record<SystemRoleName, PermissionKey[]> = {
  USER: ['admin.todos'],
  ADMIN: PERMISSIONS.map((permission) => permission.key),
}

export async function userRoleHasPermission(
  prisma: PrismaClient,
  roleName: string | null | undefined,
  permissionKey: PermissionKey,
): Promise<boolean> {
  if (!roleName) return false

  const role = await prisma.role.findUnique({
    where: { name: roleName },
    select: {
      permissions: {
        where: { permission: { key: permissionKey } },
        take: 1,
        select: { roleId: true },
      },
    },
  })

  if (!role && roleName in DEFAULT_ROLE_PERMISSIONS) {
    return DEFAULT_ROLE_PERMISSIONS[roleName as SystemRoleName].includes(permissionKey)
  }

  return (role?.permissions.length ?? 0) > 0
}

export async function getUserRolePermissionKeys(
  prisma: PrismaClient,
  roleName: string | null | undefined,
): Promise<PermissionKey[]> {
  if (!roleName) return []

  const role = await prisma.role.findUnique({
    where: { name: roleName },
    select: {
      permissions: {
        select: {
          permission: {
            select: { key: true },
          },
        },
      },
    },
  })

  if (!role && roleName in DEFAULT_ROLE_PERMISSIONS) {
    return DEFAULT_ROLE_PERMISSIONS[roleName as SystemRoleName]
  }

  const allowedKeys = new Set<PermissionKey>(PERMISSIONS.map((permission) => permission.key))
  return (role?.permissions ?? [])
    .map(({ permission }) => permission.key)
    .filter((key): key is PermissionKey => allowedKeys.has(key as PermissionKey))
}
