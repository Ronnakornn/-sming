import { Elysia } from 'elysia'
import { auth } from './auth'
import { prisma } from './prisma.ts'
import { userRoleHasPermission, type PermissionKey } from '#server/modules/role/role.permissions.ts'

export interface SessionUser {
  id: string
  email: string
  name: string
  role: string
}

export const authPlugin = new Elysia({ name: 'auth' })
  .mount(auth.handler)
  .macro({
    withAuth: {
      async resolve({ status, request: { headers } }) {
        const session = await auth.api.getSession({ headers })
        if (!session) return status(401)
        return { user: session.user as SessionUser }
      },
    },
    withRole(role: string) {
      return {
        async resolve({ status, request: { headers } }) {
          const session = await auth.api.getSession({ headers })
          if (!session) return status(401)
          const user = session.user as SessionUser
          if (user.role !== role) return status(403)
          return { user }
        }
      }
    },
    withPermission(permissionKey: PermissionKey) {
      return {
        async resolve({ status, request: { headers } }) {
          const session = await auth.api.getSession({ headers })
          if (!session) return status(401)
          const user = session.user as SessionUser
          const allowed = await userRoleHasPermission(prisma, user.role, permissionKey)
          if (!allowed) return status(403)
          return { user }
        },
      }
    },
  })
