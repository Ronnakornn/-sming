import type { ILogger } from '#server/infrastructure/logging/index.ts'
import { createLogger } from '#server/infrastructure/logging/index.ts'
import { prisma } from '#server/lib/prisma.ts'
import { PrismaTodoRepository } from '#server/modules/todo/todo.repository.ts'
import { TodoService } from '#server/modules/todo/todo.service.ts'
import { PrismaRoleRepository } from '#server/modules/role/role.repository.ts'
import { RoleService } from '#server/modules/role/role.service.ts'
import { PrismaUserRepository } from '#server/modules/user/user.repository.ts'
import { UserService } from '#server/modules/user/user.service.ts'

export interface AppConfig {
  environment: string
}

export interface AppContext {
  logger: ILogger
  config: AppConfig
}

export interface ServiceContainer {
  appContext: AppContext
  roleService: RoleService
  todoService: TodoService
  userService: UserService
}

export function createContainer(): ServiceContainer {
  const environment = process.env['NODE_ENV'] ?? 'development'
  const logger = createLogger({ environment })
  const config: AppConfig = { environment }
  const appContext: AppContext = { logger, config }

  const todoRepo = new PrismaTodoRepository(appContext, prisma)
  const todoService = new TodoService(appContext, todoRepo)
  const roleRepo = new PrismaRoleRepository(appContext, prisma)
  const roleService = new RoleService(appContext, roleRepo)
  const userRepo = new PrismaUserRepository(appContext, prisma)
  const userService = new UserService(appContext, userRepo)

  return { appContext, roleService, todoService, userService }
}
