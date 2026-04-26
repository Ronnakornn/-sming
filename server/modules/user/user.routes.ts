import { Elysia, t } from 'elysia'
import { authPlugin } from '#server/lib/auth-plugin'
import type { ServiceContainer } from '#server/context/app-context.ts'
import { UserPlain } from '#generated/prismabox/User.ts'

const AdminUserResponse = t.Pick(UserPlain, ['id', 'name', 'email', 'role', 'createdAt', 'updatedAt'])
const CreateUserBody = t.Object({
  name: t.String({ minLength: 1 }),
  email: t.String({ format: 'email' }),
  password: t.String({ minLength: 8 }),
  role: t.String({ minLength: 1 }),
})
const UpdateUserBody = t.Object({
  name: t.String({ minLength: 1 }),
  email: t.String({ format: 'email' }),
  role: t.String({ minLength: 1 }),
})
const UpdateUserRoleBody = t.Object({ role: t.String({ minLength: 1 }) })

export function createUserRoutes(container: ServiceContainer) {
  return new Elysia({ prefix: '/api/users' })
    .use(authPlugin)
    .get('/', () => container.userService.listForAdmin(), {
      withPermission: 'admin.users',
      response: t.Array(AdminUserResponse),
    })
    .post('/', ({ body }) => container.userService.createForAdmin(body), {
      withPermission: 'admin.users',
      body: CreateUserBody,
      response: AdminUserResponse,
    })
    .patch('/:id', ({ user, params: { id }, body }) => container.userService.updateForAdmin(user.id, id, body), {
      withPermission: 'admin.users',
      params: t.Object({ id: t.String() }),
      body: UpdateUserBody,
      response: AdminUserResponse,
    })
    .patch('/:id/role', ({ user, params: { id }, body }) => container.userService.updateRole(user.id, id, body.role), {
      withPermission: 'admin.users',
      params: t.Object({ id: t.String() }),
      body: UpdateUserRoleBody,
      response: AdminUserResponse,
    })
    .delete('/:id', async ({ user, params: { id } }) => {
      await container.userService.deleteForAdmin(user.id, id)
      return { success: true }
    }, {
      withPermission: 'admin.users',
      params: t.Object({ id: t.String() }),
      response: t.Object({ success: t.Boolean() }),
    })
}
