INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT 'rp_admin_' || replace(permission."key", '.', '_'), role."id", permission."id"
FROM "Role" role
CROSS JOIN "Permission" permission
WHERE role."name" = 'ADMIN' AND permission."key" IN ('admin.access', 'admin.roles')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
