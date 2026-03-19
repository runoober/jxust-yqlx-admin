import client, { unwrap } from "./client";
import type { Organization, PaginatedResult } from "@/types/api";

export interface OrganizationListParams {
  query?: string;
  organization_type?: string;
  affiliation?: string;
  campus?: string;
  page?: number;
  page_size?: number;
}

export interface OrganizationPayload {
  name: string;
  organization_type?: string;
  affiliation?: string;
  campus?: string;
  introduction?: string;
  contact?: string;
}

export function listOrganizations(params?: OrganizationListParams) {
  return unwrap<PaginatedResult<Organization>>(
    client.get("/admin/organizations", { params })
  );
}

export function getOrganization(id: number) {
  return unwrap<Organization>(client.get(`/admin/organizations/${id}`));
}

export function createOrganization(data: OrganizationPayload) {
  return unwrap<Organization>(
    client.post("/admin/organizations", data, {
      headers: {
        "X-Idempotency-Key": createIdempotencyKey(),
      },
    })
  );
}

export function updateOrganization(id: number, data: Partial<OrganizationPayload>) {
  return unwrap<Organization>(client.put(`/admin/organizations/${id}`, data));
}

export function deleteOrganization(id: number) {
  return unwrap<{ message: string }>(client.delete(`/admin/organizations/${id}`));
}

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}