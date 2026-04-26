import { AdminUserTable } from "#/features/user";
import { AdminPageIntro, AdminSpaceCat } from "#/features/admin";
import { requirePermission } from "#/lib/auth-server";

export default async function AdminUsersPage() {
  const session = await requirePermission("admin.users");

  return (
    <div className="flex flex-col gap-6">
      <AdminPageIntro
        eyebrow="Crew Access"
        title="Manage user accounts"
        description="Create accounts, adjust roles, and remove access without leaving the control deck."
      >
        <AdminSpaceCat mode="users" />
      </AdminPageIntro>
      <div className="admin-users-scope">
        <AdminUserTable currentUserId={session.user.id} />
      </div>
    </div>
  );
}
