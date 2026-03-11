import client, { unwrap } from "./client";
import type { Hero, PaginatedResult } from "@/types/api";

export function listHeroes() {
  return unwrap<string[]>(client.get("/heroes/"));
}

export function searchHeroes(params?: { page?: number; size?: number; name?: string; is_show?: boolean }) {
  return unwrap<PaginatedResult<Hero>>(client.get("/heroes/search", { params }));
}

export function createHero(data: { name: string; is_show?: boolean; sort?: number }) {
  return unwrap<Hero>(client.post("/heroes/", data));
}

export function updateHero(id: number, data: { name: string; is_show?: boolean; sort?: number }) {
  return unwrap<Hero>(client.put(`/heroes/${id}`, data));
}

export function deleteHero(id: number) {
  return unwrap<{ message: string }>(client.delete(`/heroes/${id}`));
}
