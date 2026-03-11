import client, { unwrap } from "./client";
import type { LoginRequest, LoginResponse } from "@/types/api";

export function login(data: LoginRequest) {
  return unwrap<LoginResponse>(client.post("/admin/auth/login", data));
}

export function logout() {
  return unwrap<{ message: string }>(client.post("/auth/logout"));
}

export function logoutAll() {
  return unwrap<{ message: string }>(client.post("/auth/logout-all"));
}
