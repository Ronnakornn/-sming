import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "#server/lib/auth";
import { prisma } from "#server/lib/prisma";
import { userRoleHasPermission, type PermissionKey } from "#server/modules/role";

export async function getServerSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

export async function requireUser() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function requireAdmin() {
  return requirePermission("admin.access");
}

export async function requirePermission(permissionKey: PermissionKey) {
  const session = await requireUser();

  if (!(await userRoleHasPermission(prisma, session.user.role, permissionKey))) {
    notFound();
  }

  return session;
}
