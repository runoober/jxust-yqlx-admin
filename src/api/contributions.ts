import client, { unwrap } from "./client";
import type { Contribution, ContributionStats, PaginatedResult } from "@/types/api";

export function listContributions(params: { page?: number; size?: number; status?: number }) {
  return unwrap<PaginatedResult<Contribution>>(
    client.get("/contributions/", { params })
  );
}

export function getContribution(id: number) {
  return unwrap<Contribution>(client.get(`/contributions/${id}`));
}

export function reviewContribution(id: number, data: {
  status: 2 | 3;
  review_note?: string;
  points?: number;
  title?: string;
  content?: string;
  categories?: number[];
}) {
  return unwrap<Contribution>(client.post(`/contributions/${id}/review`, data));
}

export function getContributionStatsAdmin() {
  return unwrap<ContributionStats>(client.get("/contributions/stats-admin"));
}
