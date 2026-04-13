import { Elysia } from 'elysia'
import { auth } from './auth'
import type { Role } from '#generated/client/enums.ts'

export interface SessionUser {
  id: string
  email: string
  name: string
  role: Role
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
    withRole(role: Role) {
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
  })
