import client, { unwrap } from "./client";
import type { PointsTransaction, PointsStats, PaginatedResult } from "@/types/api";

export function grantPoints(data: { user_id: number; points: number; description: string }) {
  return unwrap<{ message: string }>(client.post("/points/grant", data));
}

export function getPointsStats(userId: number) {
  return unwrap<PointsStats>(client.get("/points/stats", { params: { user_id: userId } }));
}

export function listTransactions(params: { page?: number; size?: number; user_id?: number }) {
  return unwrap<PaginatedResult<PointsTransaction>>(
    client.get("/points/transactions", { params })
  );
}
