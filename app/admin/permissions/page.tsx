import { AdminPageIntro, AdminRolePermissionMatrix, AdminSpaceCat } from "#/features/admin";
import { requirePermission } from "#/lib/auth-server";

export default async function AdminPermissionsPage() {
  await requirePermission("admin.roles");

  return (
    <div className="flex flex-col gap-6">
      <AdminPageIntro
        eyebrow="Access Matrix"
        title="Role permissions"
        description="Review which role can enter each protected admin area."
      >
        <AdminSpaceCat mode="users" />
      </AdminPageIntro>
      <AdminRolePermissionMatrix />
    </div>
  );
}
