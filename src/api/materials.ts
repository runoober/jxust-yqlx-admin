import client, { unwrap } from "./client";
import type { MaterialSearchResult, MaterialCategory, MaterialListItem, MaterialDetail, PaginatedResult, HotWord } from "@/types/api";

export function getMaterialDetail(md5: string) {
  return unwrap<MaterialDetail>(client.get(`/materials/${md5}`));
}

export function getMaterialCategories(parentId?: number) {
  return unwrap<MaterialCategory[]>(client.get("/material-categories/", { params: { parent_id: parentId } }));
}

export function listMaterials(params: { category_id?: number; page?: number; page_size?: number; sort_by?: string }) {
  return unwrap<PaginatedResult<MaterialListItem>>(client.get("/materials/", { params }));
}

export function getTopMaterials(params?: { limit?: number; type?: number }) {
  return unwrap<MaterialListItem[]>(client.get("/materials/top", { params }));
}

export function getHotWords(limit?: number) {
  return unwrap<HotWord[]>(client.get("/materials/hot-words", { params: { limit } }));
}

export function searchMaterials(params: { keywords?: string; page?: number; page_size?: number }) {
  return unwrap<MaterialSearchResult>(client.get("/materials/search", { params }));
}

export function updateMaterialDesc(md5: string, data: {
  description?: string;
  tags?: string;
  is_recommended?: boolean;
  external_link?: string;
}) {
  return unwrap<{ message: string }>(client.put(`/admin/material-desc/${md5}`, data));
}

export function deleteMaterial(md5: string) {
  return unwrap<{ message: string }>(client.delete(`/admin/materials/${md5}`));
}
