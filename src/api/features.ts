import client, { unwrap } from "./client";
import type { Feature, PaginatedResult, WhitelistUserInfo } from "@/types/api";

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
  return unwrap<Feature>(client.put(`/admin/features/${key}`, data));
}

export function deleteFeature(key: string) {
  return unwrap<{ message: string }>(client.delete(`/admin/features/${key}`));
}

// Whitelist
export function getWhitelist(key: string, params?: { page?: number; page_size?: number }) {
  return unwrap<PaginatedResult<WhitelistUserInfo>>(
    client.get(`/admin/features/${key}/whitelist`, { params })
  );
}

export function grantFeature(key: string, data: { user_id: number; expires_at?: string }) {
  return unwrap<{ message: string }>(client.post(`/admin/features/${key}/whitelist`, data));
}

export function batchGrantFeature(key: string, data: { user_ids: number[]; expires_at?: string }) {
  return unwrap<{ message: string }>(client.post(`/admin/features/${key}/whitelist/batch`, data));
}

export function revokeFeature(key: string, uid: number) {
  return unwrap<{ message: string }>(client.delete(`/admin/features/${key}/whitelist/${uid}`));
}
