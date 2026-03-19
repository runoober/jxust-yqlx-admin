import client, { unwrap } from "./client";
import type {
  SystemOnlineStat,
  PomodoroRankingItem,
  ProjectOnlineStat,
  AllProjectsOnlineStatResponse,
  QuestionProject,
  UserGroupedCountStat,
  PaginatedResult,
} from "@/types/api";

export function getSystemOnline() {
  return unwrap<SystemOnlineStat>(client.get("/stat/system/online"));
}

export function getPomodoroRanking() {
  return unwrap<PomodoroRankingItem[]>(client.get("/pomodoro/ranking"));
}

export function getQuestionProjects() {
  return unwrap<QuestionProject[]>(client.get("/questions/projects"));
}

export function getProjectOnline(projectId: number) {
  return unwrap<ProjectOnlineStat>(client.get(`/stat/project/${projectId}/online`));
}

export function getAllProjectsOnlineStats() {
  return unwrap<AllProjectsOnlineStatResponse>(client.get("/admin/stats/projects/online"));
}

export function getCountdownStatsByUser(params?: { page?: number; page_size?: number }) {
  return unwrap<PaginatedResult<UserGroupedCountStat>>(client.get("/admin/stats/countdowns/by-user", { params }));
}

export function getStudyTaskStatsByUser(params?: { page?: number; page_size?: number }) {
  return unwrap<PaginatedResult<UserGroupedCountStat>>(client.get("/admin/stats/studytasks/by-user", { params }));
}

export function getGPABackupStatsByUser(params?: { page?: number; page_size?: number }) {
  return unwrap<PaginatedResult<UserGroupedCountStat>>(client.get("/admin/stats/gpa-backups/by-user", { params }));
}
