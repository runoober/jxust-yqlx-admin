import client, { unwrap } from "./client";
import type {
  Notification,
  NotificationCategory,
  NotificationStats,
  PaginatedResult,
  ScheduleData,
} from "@/types/api";

// Notification CRUD
export function listNotifications(params: {
  page?: number;
  size?: number;
  status?: number;
  category_id?: number;
}) {
  return unwrap<PaginatedResult<Notification>>(
    client.get("/admin/notifications/", { params })
  );
}

export function getNotification(id: number) {
  return unwrap<Notification>(client.get(`/admin/notifications/${id}`));
}

export function createNotification(data: { title: string; content: string; categories: number[] }) {
  return unwrap<Notification>(client.post("/admin/notifications/", data));
}

export function updateNotification(id: number, data: { title?: string; content?: string; categories?: number[] }) {
  return unwrap<Notification>(client.put(`/admin/notifications/${id}`, data));
}

export function deleteNotification(id: number) {
  return unwrap<{ message: string }>(client.delete(`/admin/notifications/${id}`));
}

// Workflow
export function approveNotification(id: number, data: { status: 1 | 2; note?: string }) {
  return unwrap<{ message: string }>(client.post(`/admin/notifications/${id}/approve`, data));
}

export function publishNotification(id: number) {
  return unwrap<{ message: string }>(client.post(`/admin/notifications/${id}/publish`));
}

export function publishAdminNotification(id: number) {
  return unwrap<{ message: string }>(client.post(`/admin/notifications/${id}/publish-admin`));
}

export function pinNotification(id: number) {
  return unwrap<{ message: string }>(client.post(`/admin/notifications/${id}/pin`));
}

export function unpinNotification(id: number) {
  return unwrap<{ message: string }>(client.post(`/admin/notifications/${id}/unpin`));
}

export function convertToSchedule(id: number, data: ScheduleData) {
  return unwrap<{ message: string }>(client.post(`/admin/notifications/${id}/schedule`, data));
}

// Stats
export function getNotificationStats() {
  return unwrap<NotificationStats>(client.get("/admin/notifications/stats"));
}

// Categories
export function listCategories() {
  return unwrap<NotificationCategory[]>(client.get("/categories/"));
}

export function createCategory(data: { name: string; sort?: number; is_active?: boolean }) {
  return unwrap<NotificationCategory>(client.post("/admin/categories/", data));
}

export function updateCategory(id: number, data: { name?: string; sort?: number; is_active?: boolean }) {
  return unwrap<NotificationCategory>(client.put(`/admin/categories/${id}`, data));
}


