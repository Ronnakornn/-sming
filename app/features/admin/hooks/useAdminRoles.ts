"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Treaty } from "@elysiajs/eden";
import { api } from "#/lib/eden";

type GetRolesResponse = Treaty.Data<ReturnType<typeof api.api.roles.get>>;
type GetPermissionsResponse = Treaty.Data<ReturnType<typeof api.api.roles.permissions.get>>;

export type AdminRole = GetRolesResponse extends (infer T)[] ? T : never;
export type AdminPermission = GetPermissionsResponse extends (infer T)[] ? T : never;

export function useAdminRoles() {
  return useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => {
      const { data, error } = await api.api.roles.get();
      if (error) throw error;
      return data;
    },
  });
}

export function useAdminPermissions() {
  return useQuery({
    queryKey: ["admin-permissions"],
    queryFn: async () => {
      const { data, error } = await api.api.roles.permissions.get();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateAdminRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { name: string; description?: string | null }) => {
      const { data, error } = await api.api.roles.post(params);
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-roles"] }),
  });
}

export function useUpdateAdminRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; name: string; description?: string | null }) => {
      const { id, ...body } = params;
      const { data, error } = await api.api.roles({ id }).patch(body);
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-roles"] }),
  });
}

export function useUpdateRolePermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; permissionKeys: string[] }) => {
      const { id, permissionKeys } = params;
      const { data, error } = await api.api.roles({ id }).permissions.patch({ permissionKeys });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-roles"] }),
  });
}

export function useDeleteAdminRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await api.api.roles({ id }).delete();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-roles"] }),
  });
}
