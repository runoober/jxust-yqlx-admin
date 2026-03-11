import client, { unwrap } from "./client";
import type { TeacherReview, PaginatedResult } from "@/types/api";

export function listReviews(params: {
  page?: number;
  size?: number;
  status?: number;
  teacher_name?: string;
}) {
  return unwrap<PaginatedResult<TeacherReview>>(
    client.get("/reviews/", { params })
  );
}

export function approveReview(id: number, data?: { admin_note?: string }) {
  return unwrap<{ message: string }>(client.post(`/reviews/${id}/approve`, data ?? {}));
}

export function rejectReview(id: number, data?: { admin_note?: string }) {
  return unwrap<{ message: string }>(client.post(`/reviews/${id}/reject`, data ?? {}));
}

export function deleteReview(id: number) {
  return unwrap<{ message: string }>(client.delete(`/reviews/${id}`));
}
