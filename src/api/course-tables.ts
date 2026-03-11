import client, { unwrap } from "./client";
import type { CourseTable, PaginatedResult } from "@/types/api";

export interface CourseTablePayload {
  class_id: string;
  semester: string;
  course_data: Record<string, unknown>;
}

export function listCourseTables(params?: {
  class_id?: string;
  semester?: string;
  keyword?: string;
  page?: number;
  page_size?: number;
}) {
  return unwrap<PaginatedResult<CourseTable>>(client.get("/admin/coursetables", { params }));
}

export function getCourseTable(id: number) {
  return unwrap<CourseTable>(client.get(`/admin/coursetables/${id}`));
}

export function createCourseTable(data: CourseTablePayload) {
  return unwrap<CourseTable>(client.post("/admin/coursetables", data));
}

export function updateCourseTable(id: number, data: CourseTablePayload) {
  return unwrap<string>(client.put(`/admin/coursetables/${id}`, data));
}

export function deleteCourseTable(id: number) {
  return unwrap<string>(client.delete(`/admin/coursetables/${id}`));
}

export function getCourseTableBindCount() {
  return unwrap<{ bind_count: number }>(client.get("/coursetable/bind-count"));
}

export function resetCourseTableBindCount(userId: number) {
  return unwrap<string>(client.post(`/coursetable/reset/${userId}`));
}
