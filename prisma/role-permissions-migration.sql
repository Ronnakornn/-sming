-- Preserve existing User.role values while moving from the old Role enum to
-- table-backed roles and permissions.

ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE TEXT USING "role"::text;
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'Role' AND typtype = 'e'
  ) THEN
    DROP TYPE "Role";
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "Role" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "system" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Role_name_key" ON "Role"("name");

CREATE TABLE IF NOT EXISTS "Permission" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "group" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Permission_key_key" ON "Permission"("key");

CREATE TABLE IF NOT EXISTS "RolePermission" (
  "id" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "permissionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId", "permissionId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'RolePermission_roleId_fkey'
  ) THEN
    ALTER TABLE "RolePermission"
      ADD CONSTRAINT "RolePermission_roleId_fkey"
      FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'RolePermission_permissionId_fkey'
  ) THEN
    ALTER TABLE "RolePermission"
      ADD CONSTRAINT "RolePermission_permissionId_fkey"
      FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "Role" ("id", "name", "description", "system", "updatedAt")
VALUES
  ('role_user', 'USER', 'Default role for regular signed-in users.', true, CURRENT_TIMESTAMP),
  ('role_admin', 'ADMIN', 'Full administrator access.', true, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO UPDATE SET
  "system" = EXCLUDED."system",
  "description" = EXCLUDED."description",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "Permission" ("id", "key", "label", "description", "group", "updatedAt")
VALUES
  ('perm_admin_access', 'admin.access', 'Admin access', 'Enter the protected admin area.', 'Admin', CURRENT_TIMESTAMP),
  ('perm_admin_dashboard', 'admin.dashboard', 'Admin dashboard', 'View admin overview metrics and navigation.', 'Admin', CURRENT_TIMESTAMP),
  ('perm_admin_users', 'admin.users', 'User management', 'Create users, edit accounts, assign roles, and remove access.', 'Users', CURRENT_TIMESTAMP),
  ('perm_admin_roles', 'admin.roles', 'Role permissions', 'Create roles and manage permission assignments.', 'Access', CURRENT_TIMESTAMP),
  ('perm_admin_todos', 'admin.todos', 'Admin todo workspace', 'Open the todo workspace from the admin area.', 'Tasks', CURRENT_TIMESTAMP),
  ('perm_admin_profile', 'admin.profile', 'Admin profile', 'Review the current administrator profile and session.', 'Account', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO UPDATE SET
  "label" = EXCLUDED."label",
  "description" = EXCLUDED."description",
  "group" = EXCLUDED."group",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT 'rp_admin_' || replace(permission."key", '.', '_'), role."id", permission."id"
FROM "Role" role
CROSS JOIN "Permission" permission
WHERE role."name" = 'ADMIN'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- Safety net: ADMIN must never lose the permissions required to enter and manage
-- role permissions, otherwise administrators can lock themselves out of
-- /admin/permissions.
INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT 'rp_admin_' || replace(permission."key", '.', '_'), role."id", permission."id"
FROM "Role" role
CROSS JOIN "Permission" permission
WHERE role."name" = 'ADMIN' AND permission."key" IN ('admin.access', 'admin.roles')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT 'rp_user_admin_todos', role."id", permission."id"
FROM "Role" role
CROSS JOIN "Permission" permission
WHERE role."name" = 'USER' AND permission."key" = 'admin.todos'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- Preserve any pre-existing custom user role values before enforcing the
-- User.role -> Role.name relationship. Custom roles start without permissions
-- and can be configured from /admin/permissions after migration.
INSERT INTO "Role" ("id", "name", "description", "system", "updatedAt")
SELECT
  'role_import_' || md5("User"."role"),
  "User"."role",
  'Imported from existing user role values.',
  false,
  CURRENT_TIMESTAMP
FROM (SELECT DISTINCT "role" FROM "User" WHERE "role" IS NOT NULL) "User"
WHERE NOT EXISTS (
  SELECT 1 FROM "Role" role WHERE role."name" = "User"."role"
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'User_role_fkey'
  ) THEN
    ALTER TABLE "User"
      ADD CONSTRAINT "User_role_fkey"
      FOREIGN KEY ("role") REFERENCES "Role"("name") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
