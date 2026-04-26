"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2Icon,
  LockKeyholeIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  Trash2Icon,
  UserRoundIcon,
} from "lucide-react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Skeleton } from "#/components/ui/skeleton";
import { Switch } from "#/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
import { ROLES, isAdminRole } from "#/lib/roles";
import {
  type AdminRole,
  useAdminPermissions,
  useAdminRoles,
  useCreateAdminRole,
  useDeleteAdminRole,
  useUpdateAdminRole,
  useUpdateRolePermissions,
} from "../hooks/useAdminRoles";

interface RoleFormState {
  name: string;
  description: string;
}

const EMPTY_ROLE_FORM: RoleFormState = {
  name: "",
  description: "",
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (
    typeof error === "object" &&
    error !== null &&
    "value" in error &&
    typeof (error as { value?: unknown }).value === "object" &&
    (error as { value?: { message?: unknown } }).value?.message
  ) {
    return String((error as { value?: { message?: unknown } }).value?.message);
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return fallback;
}

function RoleDialog(props: {
  open: boolean;
  mode: "create" | "edit";
  initialValues: RoleFormState;
  system?: boolean;
  pending: boolean;
  errorMessage: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: RoleFormState) => Promise<void>;
}) {
  const { open, mode, initialValues, system = false, pending, errorMessage, onOpenChange, onSubmit } = props;
  const [form, setForm] = useState<RoleFormState>(initialValues);

  useEffect(() => {
    if (open) setForm(initialValues);
  }, [initialValues.name, initialValues.description, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border border-white/12 bg-slate-950/95 text-slate-100 shadow-[0_24px_80px_rgba(2,6,23,0.8)] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create role" : "Edit role"}</DialogTitle>
          <DialogDescription className="text-slate-400">
            {mode === "create"
              ? "Create a role, then enable the permissions it should have."
              : "Update the role label and description."}
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void onSubmit(form);
          }}
        >
          {errorMessage ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/12 px-3 py-2 text-sm text-red-200">
              {errorMessage}
            </div>
          ) : null}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-200" htmlFor={`${mode}-role-name`}>
              Role name
            </label>
            <Input
              id={`${mode}-role-name`}
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              className="border-white/10 bg-slate-900/80 text-slate-100 placeholder:text-slate-500"
              placeholder="SUPPORT_TEAM"
              disabled={system}
              required
            />
            <p className="text-xs text-slate-400">Use uppercase letters, numbers, and underscores.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-200" htmlFor={`${mode}-role-description`}>
              Description
            </label>
            <Input
              id={`${mode}-role-description`}
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              className="border-white/10 bg-slate-900/80 text-slate-100 placeholder:text-slate-500"
              placeholder="What this role is for"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="border-white/12 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[linear-gradient(90deg,rgba(34,211,238,0.9),rgba(168,85,247,0.9))] text-slate-950 hover:opacity-95"
              disabled={pending}
            >
              {pending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AdminRolePermissionSkeleton() {
  return (
    <Card className="admin-panel overflow-hidden rounded-2xl border-white/10 bg-white/5 py-0">
      <CardHeader className="border-b border-white/10 px-5 py-5">
        <Skeleton className="h-7 w-56 bg-white/12" />
      </CardHeader>
      <CardContent className="space-y-3 p-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-14 w-full bg-white/10" />
        ))}
      </CardContent>
    </Card>
  );
}

export function AdminRolePermissionMatrix() {
  const { data: roles = [], isLoading: rolesLoading, error: rolesError, refetch: refetchRoles } = useAdminRoles();
  const { data: permissions = [], isLoading: permissionsLoading, error: permissionsError } = useAdminPermissions();
  const createRole = useCreateAdminRole();
  const updateRole = useUpdateAdminRole();
  const updatePermissions = useUpdateRolePermissions();
  const deleteRole = useDeleteAdminRole();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<AdminRole | null>(null);
  const [deletingRole, setDeletingRole] = useState<AdminRole | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const groupedPermissions = useMemo(() => {
    return permissions.reduce<Record<string, typeof permissions>>((groups, permission) => {
      groups[permission.group] = [...(groups[permission.group] ?? []), permission];
      return groups;
    }, {});
  }, [permissions]);

  const isLoading = rolesLoading || permissionsLoading;
  const error = rolesError ?? permissionsError;

  if (isLoading) return <AdminRolePermissionSkeleton />;

  if (error) {
    return (
      <Card className="border-red-500/30 bg-red-500/10">
        <CardContent className="pt-6">
          <p className="text-sm text-red-200">{getErrorMessage(error, "Failed to load roles")}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 border-white/12 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white"
            onClick={() => void refetchRoles()}
          >
            <RefreshCwIcon className="size-3.5" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="admin-permissions-scope flex flex-col gap-5">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {roles.map((role) => {
          const Icon = isAdminRole(role.name) ? ShieldCheckIcon : UserRoundIcon;
          return (
            <Card key={role.id} className="admin-panel rounded-2xl border-white/10 bg-white/5">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-3 text-white">
                  <span className="flex min-w-0 items-center gap-2">
                    <Icon className="size-5 shrink-0 text-cyan-200" />
                    <span className="truncate">{role.name}</span>
                  </span>
                  <Badge variant="outline" className="border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
                    {role.system ? "System" : "Custom"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-white">
                  {role.permissions.length}
                  <span className="text-base font-medium text-slate-300"> / {permissions.length}</span>
                </p>
                <p className="mt-2 min-h-10 text-sm text-slate-300">
                  {role.description || "No description set."}
                </p>
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-cyan-300/20 bg-cyan-300/8 text-cyan-100 hover:bg-cyan-300/16 hover:text-white"
                    onClick={() => {
                      setFormError(null);
                      setEditingRole(role);
                    }}
                  >
                    <PencilIcon className="size-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="bg-red-500 text-white hover:bg-red-500/90 disabled:bg-red-500/35"
                    disabled={role.system}
                    onClick={() => {
                      setDeleteError(null);
                      setDeletingRole(role);
                    }}
                  >
                    <Trash2Icon className="size-3.5" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <Card className="admin-panel overflow-hidden rounded-2xl border-white/10 bg-white/5 py-0">
        <CardHeader className="border-b border-white/10 px-5 py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-white">
              <LockKeyholeIcon className="size-5 text-cyan-200" />
              Permission matrix
            </CardTitle>
            <Button
              size="sm"
              className="border border-cyan-300/30 bg-[linear-gradient(90deg,rgba(125,211,252,0.95),rgba(167,243,208,0.95))] font-semibold text-slate-950 hover:brightness-105"
              onClick={() => {
                setFormError(null);
                setIsCreateOpen(true);
              }}
            >
              <PlusIcon className="size-4" />
              Create Role
            </Button>
          </div>
          {permissionError ? (
            <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/12 px-3 py-2 text-sm text-red-200">
              {permissionError}
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 bg-white/5 hover:bg-white/5">
                <TableHead className="min-w-72 px-5 text-slate-200">Permission</TableHead>
                {roles.map((role) => (
                  <TableHead key={role.id} className="min-w-36 px-5 text-center text-slate-200">
                    {role.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(groupedPermissions).map(([group, groupPermissions]) => (
                <Fragment key={group}>
                  <TableRow key={group} className="border-white/10 bg-white/5 hover:bg-white/5">
                    <TableCell colSpan={roles.length + 1} className="px-5 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">
                      {group}
                    </TableCell>
                  </TableRow>
                  {groupPermissions.map((permission) => (
                    <TableRow key={permission.key} className="border-white/10 hover:bg-white/5">
                      <TableCell className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-white">{permission.label}</span>
                          <span className="text-sm text-slate-300">{permission.description}</span>
                          <span className="font-mono text-xs text-cyan-100">{permission.key}</span>
                        </div>
                      </TableCell>
                      {roles.map((role) => {
                        const enabled = role.permissions.some((item) => item.key === permission.key);
                        const nextPermissionKeys = enabled
                          ? role.permissions.map((item) => item.key).filter((key) => key !== permission.key)
                          : [...role.permissions.map((item) => item.key), permission.key];
                        const isLockedAdminPermission =
                          role.name === ROLES.ADMIN &&
                          (permission.key === "admin.access" || permission.key === "admin.roles");

                        return (
                          <TableCell key={role.id} className="px-5 py-4 text-center">
                            <div className="inline-flex min-w-24 items-center justify-center gap-2 rounded-full border border-white/10 bg-slate-950/50 px-3 py-2">
                              <Switch
                                checked={enabled}
                                disabled={updatePermissions.isPending || isLockedAdminPermission}
                                aria-label={`${role.name} ${permission.label}`}
                                className="data-[state=checked]:bg-cyan-300"
                                size="sm"
                                onCheckedChange={() => {
                                  setPermissionError(null);
                                  void updatePermissions
                                    .mutateAsync({
                                      id: role.id,
                                      permissionKeys: nextPermissionKeys,
                                    })
                                    .catch((submitError) => {
                                      setPermissionError(getErrorMessage(submitError, "Failed to update permissions"));
                                    });
                                }}
                              />
                              {enabled ? (
                                <CheckCircle2Icon className="size-4 text-cyan-200" />
                              ) : (
                                <LockKeyholeIcon className="size-4 text-slate-500" />
                              )}
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <RoleDialog
        open={isCreateOpen}
        mode="create"
        initialValues={EMPTY_ROLE_FORM}
        pending={createRole.isPending}
        errorMessage={formError}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) setFormError(null);
        }}
        onSubmit={async (values) => {
          try {
            setFormError(null);
            await createRole.mutateAsync(values);
            setIsCreateOpen(false);
          } catch (submitError) {
            setFormError(getErrorMessage(submitError, "Failed to create role"));
          }
        }}
      />

      <RoleDialog
        open={editingRole !== null}
        mode="edit"
        system={editingRole?.system}
        initialValues={{
          name: editingRole?.name ?? "",
          description: editingRole?.description ?? "",
        }}
        pending={updateRole.isPending}
        errorMessage={formError}
        onOpenChange={(open) => {
          if (!open) {
            setEditingRole(null);
            setFormError(null);
          }
        }}
        onSubmit={async (values) => {
          if (!editingRole) return;
          try {
            setFormError(null);
            await updateRole.mutateAsync({
              id: editingRole.id,
              name: values.name,
              description: values.description,
            });
            setEditingRole(null);
          } catch (submitError) {
            setFormError(getErrorMessage(submitError, "Failed to update role"));
          }
        }}
      />

      <Dialog
        open={deletingRole !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingRole(null);
            setDeleteError(null);
          }
        }}
      >
        <DialogContent className="border border-white/12 bg-slate-950/95 text-slate-100 shadow-[0_24px_80px_rgba(2,6,23,0.8)]">
          <DialogHeader>
            <DialogTitle>Delete role</DialogTitle>
            <DialogDescription className="text-slate-400">
              Roles assigned to users cannot be deleted.
            </DialogDescription>
          </DialogHeader>
          {deleteError ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/12 px-3 py-2 text-sm text-red-200">
              {deleteError}
            </div>
          ) : null}
          <div className="rounded-lg border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-slate-100">
            Delete <span className="font-semibold">{deletingRole?.name}</span>?
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="border-white/12 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white"
              disabled={deleteRole.isPending}
              onClick={() => setDeletingRole(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="bg-red-500 text-white hover:bg-red-500/90 disabled:bg-red-500/35"
              disabled={deleteRole.isPending || !deletingRole}
              onClick={() => {
                if (!deletingRole) return;
                void deleteRole
                  .mutateAsync(deletingRole.id)
                  .then(() => {
                    setDeletingRole(null);
                    setDeleteError(null);
                  })
                  .catch((submitError) => {
                    setDeleteError(getErrorMessage(submitError, "Failed to delete role"));
                  });
              }}
            >
              {deleteRole.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
