import client, { unwrap } from "./client";
import type { UserAuthDetail, UserFeatureInfo } from "@/types/api";

export function getUser(id: number) {
  return unwrap<UserAuthDetail>(client.get(`/admin/users/${id}`));
}

export function banUser(id: number, data: { reason?: string; duration_seconds?: number }) {
  return unwrap<{ message: string }>(client.post(`/admin/users/${id}/ban`, data));
}

export function unbanUser(id: number) {
  return unwrap<{ message: string }>(client.post(`/admin/users/${id}/unban`));
}

export function kickUser(id: number) {
  return unwrap<{ message: string }>(client.post(`/admin/users/${id}/kick`));
}

export function getUserFeatures(id: number) {
  return unwrap<UserFeatureInfo[]>(client.get(`/admin/users/${id}/features`));
}

export function setLoginCredentials(id: number, data: { phone: string; password: string }) {
  return unwrap<{ message: string }>(client.put(`/admin/users/${id}/login-credentials`, data));
}

export function resetUserCourseTableBindCount(id: number) {
  return unwrap<string>(client.post(`/coursetable/reset/${id}`));
}
