import client, { unwrap } from "./client";
import type { FailRate, PaginatedResult } from "@/types/api";

export interface FailRatePayload {
  course_name: string;
  department: string;
  semester: string;
  failrate: number;
}

export function listFailRates(params?: {
  keyword?: string;
  department?: string;
  semester?: string;
  page?: number;
  page_size?: number;
}) {
  return unwrap<PaginatedResult<FailRate>>(client.get("/admin/failrates", { params }));
}

export function getFailRate(id: number) {
  return unwrap<FailRate>(client.get(`/admin/failrates/${id}`));
}

export function createFailRate(data: FailRatePayload) {
  return unwrap<FailRate>(client.post("/admin/failrates", data));
}

export function updateFailRate(id: number, data: FailRatePayload) {
  return unwrap<string>(client.put(`/admin/failrates/${id}`, data));
}

export function deleteFailRate(id: number) {
  return unwrap<string>(client.delete(`/admin/failrates/${id}`));
}
