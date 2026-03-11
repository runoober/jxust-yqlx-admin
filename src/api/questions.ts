import client, { unwrap } from "./client";
import type { PaginatedResult, QuestionItem, QuestionProject } from "@/types/api";

export interface QuestionProjectPayload {
  name: string;
  description: string;
  version: number;
  sort: number;
  is_active: boolean;
}

export interface QuestionPayload {
  project_id: number;
  parent_id: number | null;
  type: number;
  title: string;
  options: string[];
  answer: string;
  sort: number;
  is_active: boolean;
}

function normalizeQuestionOptions(options: unknown): string[] {
  if (Array.isArray(options)) {
    return options.filter((item): item is string => typeof item === "string");
  }

  if (typeof options === "string") {
    const value = options.trim();
    if (!value) {
      return [];
    }

    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === "string");
      }
    } catch {
      // Fall back to treating non-JSON text as newline-delimited options.
    }

    return value.includes("\n")
      ? value
          .split(/\r?\n/)
          .map((item) => item.trim())
          .filter(Boolean)
      : [value];
  }

  return [];
}

function normalizeQuestionParentId(parentId: unknown): number | null {
  if (typeof parentId !== "number" || Number.isNaN(parentId) || parentId <= 0) {
    return null;
  }

  return parentId;
}

function normalizeQuestionItem(item: QuestionItem): QuestionItem {
  return {
    ...item,
    parent_id: normalizeQuestionParentId((item as QuestionItem & { parent_id?: unknown }).parent_id),
    options: normalizeQuestionOptions((item as QuestionItem & { options?: unknown }).options),
    sub_questions: Array.isArray((item as QuestionItem & { sub_questions?: unknown }).sub_questions)
      ? ((item as QuestionItem & { sub_questions?: QuestionItem[] }).sub_questions ?? []).map(normalizeQuestionItem)
      : undefined,
  };
}

function normalizeQuestionPage(page: PaginatedResult<QuestionItem>): PaginatedResult<QuestionItem> {
  return {
    ...page,
    data: (page.data ?? []).map(normalizeQuestionItem),
  };
}

export function listAdminQuestionProjects(params?: {
  keyword?: string;
  is_active?: boolean;
  page?: number;
  page_size?: number;
}) {
  return unwrap<PaginatedResult<QuestionProject>>(client.get("/admin/questions/projects", { params }));
}

export function getAdminQuestionProject(id: number) {
  return unwrap<QuestionProject>(client.get(`/admin/questions/projects/${id}`));
}

export function createQuestionProject(data: QuestionProjectPayload) {
  return unwrap<unknown>(client.post("/admin/questions/projects", data));
}

export function updateQuestionProject(id: number, data: QuestionProjectPayload) {
  return unwrap<string>(client.put(`/admin/questions/projects/${id}`, data));
}

export function deleteQuestionProject(id: number) {
  return unwrap<string>(client.delete(`/admin/questions/projects/${id}`));
}

export function listQuestions(params?: {
  project_id?: number;
  keyword?: string;
  is_active?: boolean;
  parent_id?: number;
  type?: number;
  sort_min?: number;
  sort_max?: number;
  created_from?: string;
  created_to?: string;
  page?: number;
  page_size?: number;
}) {
  return unwrap<PaginatedResult<QuestionItem>>(client.get("/admin/questions", { params })).then(normalizeQuestionPage);
}

export function getQuestion(id: number) {
  return unwrap<QuestionItem>(client.get(`/admin/questions/${id}`)).then(normalizeQuestionItem);
}

export function createQuestion(data: QuestionPayload) {
  return unwrap<unknown>(
    client.post("/admin/questions", {
      ...data,
      parent_id: data.parent_id ?? 0,
    }),
  );
}

export function updateQuestion(id: number, data: QuestionPayload) {
  return unwrap<string>(
    client.put(`/admin/questions/${id}`, {
      ...data,
      parent_id: data.parent_id ?? 0,
    }),
  );
}

export function deleteQuestion(id: number) {
  return unwrap<string>(client.delete(`/admin/questions/${id}`));
}
