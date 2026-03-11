import client, { unwrap } from "./client";
import type { Permission, Role, RolesWithPermissions, RoleWithUsers, UserPermissionsResult } from "@/types/api";

// Permissions
export function listPermissions() {
  return unwrap<Permission[]>(client.get("/admin/rbac/permissions"));
}

export function createPermission(data: { name: string; permission_tag: string; description?: string }) {
  return unwrap<Permission>(client.post("/admin/rbac/permissions", data));
}

// Roles
export function listRoles() {
  return unwrap<RoleWithUsers[]>(client.get("/admin/rbac/roles"));
}

export function createRole(data: { name: string; role_tag: string; description?: string }) {
  return unwrap<Role>(client.post("/admin/rbac/roles", data));
}

export function updateRole(id: number, data: { name: string; description?: string }) {
  return unwrap<Role>(client.put(`/admin/rbac/roles/${id}`, data));
}

// Role Permissions
export function listAllRolesWithPermissions() {
  return unwrap<RolesWithPermissions>(client.get("/admin/rbac/roles/permissions"));
}

export function updateRolePermissions(id: number, permissionIds: number[]) {
  return unwrap<{ role_id: number }>(
    client.post(`/admin/rbac/roles/${id}/permissions`, { permission_ids: permissionIds })
  );
}

// User Roles & Permissions
export function getUserPermissions(userId: number) {
  return unwrap<UserPermissionsResult>(client.get(`/admin/rbac/users/${userId}/permissions`));
}

export function updateUserRoles(userId: number, roleIds: number[]) {
  return unwrap<{ user_id: number }>(
    client.post(`/admin/rbac/users/${userId}/roles`, { role_ids: roleIds })
  );
}
