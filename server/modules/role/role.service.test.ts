import { beforeEach, describe, expect, it, vi } from "vitest"
import { RoleService } from "./role.service.ts"
import type { IRoleRepository, RoleWithPermissions } from "./role.repository.ts"
import type { Permission } from "#generated/client/client.ts"

function createLogger() {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    trace: vi.fn(),
    child: vi.fn(),
  }
}

function createAppContext() {
  return {
    logger: createLogger(),
    config: { environment: "test" },
  }
}

function createPermission(key: string): Permission {
  const now = new Date("2026-04-12T00:00:00.000Z")
  return {
    id: `perm-${key}`,
    key,
    label: key,
    description: key,
    group: "Test",
    createdAt: now,
    updatedAt: now,
  }
}

function createRole(overrides: Partial<RoleWithPermissions> = {}): RoleWithPermissions {
  const now = new Date("2026-04-12T00:00:00.000Z")
  return {
    id: overrides.id ?? "role-1",
    name: overrides.name ?? "SUPPORT",
    description: overrides.description ?? null,
    system: overrides.system ?? false,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    permissions: overrides.permissions ?? [],
  }
}

function createRepoMock(): IRoleRepository {
  return {
    ensureDefaults: vi.fn(),
    findMany: vi.fn(),
    findPermissions: vi.fn(),
    findById: vi.fn(),
    findByName: vi.fn(),
    countUsersWithRole: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    setPermissions: vi.fn(),
  }
}

describe("RoleService", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("normalizes custom role names when creating roles", async () => {
    const repo = createRepoMock()
    const createdRole = createRole({ name: "SUPPORT_TEAM" })
    vi.mocked(repo.findByName).mockResolvedValue(null)
    vi.mocked(repo.create).mockResolvedValue(createdRole)

    const service = new RoleService(createAppContext(), repo)

    await expect(
      service.createRole({ name: " support team ", description: " Handles tickets " }),
    ).resolves.toMatchObject({ name: "SUPPORT_TEAM" })

    expect(repo.create).toHaveBeenCalledWith({
      name: "SUPPORT_TEAM",
      description: "Handles tickets",
    })
  })

  it("rejects reserved system role names for custom roles", async () => {
    const service = new RoleService(createAppContext(), createRepoMock())

    await expect(service.createRole({ name: "ADMIN" })).rejects.toMatchObject({
      message: "Use a different name for custom roles",
      statusCode: 400,
    })
  })

  it("prevents removing required ADMIN permissions", async () => {
    const repo = createRepoMock()
    vi.mocked(repo.findById).mockResolvedValue(createRole({ id: "role-admin", name: "ADMIN", system: true }))

    const service = new RoleService(createAppContext(), repo)

    await expect(
      service.setPermissions("role-admin", ["admin.access"]),
    ).rejects.toMatchObject({
      message: "ADMIN must keep admin access and role permissions",
      statusCode: 400,
    })

    expect(repo.setPermissions).not.toHaveBeenCalled()
  })

  it("rejects unknown permission keys", async () => {
    const repo = createRepoMock()
    vi.mocked(repo.findById).mockResolvedValue(createRole())

    const service = new RoleService(createAppContext(), repo)

    await expect(service.setPermissions("role-1", ["admin.users", "billing.read"])).rejects.toMatchObject({
      message: "Invalid permission: billing.read",
      statusCode: 400,
    })
  })

  it("does not delete a role assigned to users", async () => {
    const repo = createRepoMock()
    vi.mocked(repo.findById).mockResolvedValue(createRole({ id: "role-support", name: "SUPPORT" }))
    vi.mocked(repo.countUsersWithRole).mockResolvedValue(2)

    const service = new RoleService(createAppContext(), repo)

    await expect(service.deleteRole("role-support")).rejects.toMatchObject({
      message: "Role is assigned to users and cannot be deleted",
      statusCode: 400,
    })

    expect(repo.delete).not.toHaveBeenCalled()
  })

  it("returns permissions in role responses", async () => {
    const repo = createRepoMock()
    vi.mocked(repo.findMany).mockResolvedValue([
      createRole({
        permissions: [
          { permission: createPermission("admin.users") },
          { permission: createPermission("admin.roles") },
        ],
      }),
    ])

    const service = new RoleService(createAppContext(), repo)

    await expect(service.listRoles()).resolves.toMatchObject([
      {
        name: "SUPPORT",
        permissions: [
          { key: "admin.users" },
          { key: "admin.roles" },
        ],
      },
    ])
  })
})
