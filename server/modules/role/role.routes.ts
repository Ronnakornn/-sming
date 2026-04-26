import { Elysia, t } from 'elysia'
import { authPlugin } from '#server/lib/auth-plugin'
import type { ServiceContainer } from '#server/context/app-context.ts'

const PermissionResponse = t.Object({
  id: t.String(),
  key: t.String(),
  label: t.String(),
  description: t.String(),
  group: t.String(),
})

const RoleResponse = t.Object({
  id: t.String(),
  name: t.String(),
  description: t.Nullable(t.String()),
  system: t.Boolean(),
  createdAt: t.Date(),
  updatedAt: t.Date(),
  permissions: t.Array(PermissionResponse),
})

const CreateRoleBody = t.Object({
  name: t.String({ minLength: 2 }),
  description: t.Optional(t.Nullable(t.String())),
})

const UpdateRoleBody = t.Object({
  name: t.String({ minLength: 2 }),
  description: t.Optional(t.Nullable(t.String())),
})

const SetRolePermissionsBody = t.Object({
  permissionKeys: t.Array(t.String()),
})

export function createRoleRoutes(container: ServiceContainer) {
  return new Elysia({ prefix: '/api/roles' })
    .use(authPlugin)
    .get('/', () => container.roleService.listRoles(), {
      withPermission: 'admin.roles',
      response: t.Array(RoleResponse),
    })
    .post('/', ({ body }) => container.roleService.createRole(body), {
      withPermission: 'admin.roles',
      body: CreateRoleBody,
      response: RoleResponse,
    })
    .get('/permissions', () => container.roleService.listPermissions(), {
      withPermission: 'admin.roles',
      response: t.Array(PermissionResponse),
    })
    .patch('/:id', ({ params: { id }, body }) => container.roleService.updateRole(id, body), {
      withPermission: 'admin.roles',
      params: t.Object({ id: t.String() }),
      body: UpdateRoleBody,
      response: RoleResponse,
    })
    .patch('/:id/permissions', ({ params: { id }, body }) => container.roleService.setPermissions(id, body.permissionKeys), {
      withPermission: 'admin.roles',
      params: t.Object({ id: t.String() }),
      body: SetRolePermissionsBody,
      response: RoleResponse,
    })
    .delete('/:id', async ({ params: { id } }) => {
      await container.roleService.deleteRole(id)
      return { success: true }
    }, {
      withPermission: 'admin.roles',
      params: t.Object({ id: t.String() }),
      response: t.Object({ success: t.Boolean() }),
    })
}
