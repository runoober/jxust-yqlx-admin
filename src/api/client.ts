import axios from "axios";
import type { ApiResponse } from "@/types/api";

const DEFAULT_API_ORIGIN = "https://wx.ntrun.com";

function resolveApiBaseURL() {
  const raw = import.meta.env.VITE_API_BASE_URL?.trim() || DEFAULT_API_ORIGIN;
  const normalized = raw.replace(/\/+$/, "");
  return /\/api\/v\d+$/.test(normalized) ? normalized : `${normalized}/api/v0`;
}

const API_BASE_URL = resolveApiBaseURL();

function isAuthFlowRequest(url?: string) {
  if (!url) {
    return false;
  }

  return /\/admin\/auth\/login$|\/auth\/refresh$/.test(url);
}

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// Request: inject Bearer token
client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Track refresh state to avoid concurrent refreshes
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  failedQueue = [];
}

// Response: unwrap envelope, handle 401 refresh
client.interceptors.response.use(
  (response) => {
    const data = response.data as ApiResponse<unknown>;
    if (data.StatusCode !== undefined && data.StatusCode !== 0) {
      return Promise.reject(new ApiError(data.StatusCode, data.StatusMessage, data.RequestId));
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = typeof originalRequest?.url === "string" ? originalRequest.url : undefined;

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthFlowRequest(requestUrl)) {
      const refreshToken = localStorage.getItem("refresh_token");
      if (!refreshToken) {
        clearAuth();
        if (window.location.pathname !== "/login") {
          window.history.replaceState({}, "", "/login");
          window.dispatchEvent(new PopStateEvent("popstate"));
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return client(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });
        const result = res.data.Result;
        localStorage.setItem("token", result.token);
        if (result.refresh_token) {
          localStorage.setItem("refresh_token", result.refresh_token);
        }
        client.defaults.headers.common.Authorization = `Bearer ${result.token}`;
        processQueue(null, result.token);
        originalRequest.headers.Authorization = `Bearer ${result.token}`;
        return client(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearAuth();
        if (window.location.pathname !== "/login") {
          window.history.replaceState({}, "", "/login");
          window.dispatchEvent(new PopStateEvent("popstate"));
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    // Extract StatusMessage from error response body if available
    const respData = error.response?.data;
    if (respData?.StatusMessage) {
      return Promise.reject(new ApiError(respData.StatusCode ?? -1, respData.StatusMessage, respData.RequestId ?? ""));
    }
    return Promise.reject(error);
  }
);

function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user_info");
}

export class ApiError extends Error {
  statusCode: number;
  requestId: string;

  constructor(statusCode: number, message: string, requestId: string) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.requestId = requestId;
  }
}

/** Extract .data.Result from the envelope */
export async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const res = await promise;
  return res.data.Result;
}

export default client;
