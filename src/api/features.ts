import client, { unwrap } from "./client";
import type { Feature, PaginatedResult, WhitelistUserInfo } from "@/types/api";

// ---- CRUD ----

export function listFeatures() {
  return unwrap<Feature[]>(client.get("/admin/features"));
}

export function createFeature(data: {
  feature_key: string;
  feature_name: string;
  description?: string;
  is_enabled?: boolean;
}) {
  return unwrap<Feature>(client.post("/admin/features", data));
}

export function getFeature(key: string) {
  return unwrap<Feature>(client.get(`/admin/features/${key}`));
}

export function updateFeature(key: string, data: { feature_name?: string; description?: string; is_enabled?: boolean }) {
  return unwrap<{ message: string }>(client.put(`/admin/features/${key}`, data));
}

export function deleteFeature(key: string) {
  return unwrap<{ message: string }>(client.delete(`/admin/features/${key}`));
}

// ---- Whitelist ----

interface WhitelistRaw {
  data: WhitelistUserInfo[];
  total: number;
  page: number;
  page_size: number;
}

export async function getWhitelist(key: string, params?: { page?: number; page_size?: number }) {
  const raw = await unwrap<WhitelistRaw>(client.get(`/admin/features/${key}/whitelist`, { params }));
  return {
    data: raw.data ?? [],
    total: raw.total ?? 0,
    page: raw.page ?? 1,
    size: raw.page_size ?? 20,
  } as PaginatedResult<WhitelistUserInfo>;
}

export function grantFeature(key: string, data: { user_id?: number; user_ids?: number[] }) {
  return unwrap<{ message: string }>(client.post(`/admin/features/${key}/whitelist`, data));
}

export function revokeFeature(key: string, userId: number) {
  return unwrap<{ message: string }>(client.delete(`/admin/features/${key}/whitelist/${userId}`));
}

// ---- Roles ----

export function grantFeatureRole(key: string, data: { role_id?: number; role_ids?: number[] }) {
  return unwrap<{ message: string }>(client.post(`/admin/features/${key}/roles`, data));
}

export function revokeFeatureRole(key: string, roleId: number) {
  return unwrap<{ message: string }>(client.delete(`/admin/features/${key}/roles/${roleId}`));
}

// ---- User-facing ----

export function getMyFeatures() {
  return unwrap<{ features: string[] }>(client.get("/user/features"));
}

// ---- Admin: query user's features ----

export function getAdminUserFeatures(userId: number) {
  return unwrap<{ feature_key: string; feature_name: string }[]>(client.get(`/admin/users/${userId}/features`));
}
