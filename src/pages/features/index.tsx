import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listFeatures,
  createFeature,
  updateFeature,
  deleteFeature,
  getFeature,
  getWhitelist,
  grantFeature,
  revokeFeature,
  grantFeatureRole,
  revokeFeatureRole,
} from "@/api/features";
import { listRoles } from "@/api/rbac";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ToggleRight, Plus, Users, Shield, Trash2, Pencil } from "lucide-react";
import type { Feature } from "@/types/api";

export default function FeaturesPage() {
  const qc = useQueryClient();
  const { data: features, isLoading } = useQuery({ queryKey: ["features"], queryFn: listFeatures });
  const [createOpen, setCreateOpen] = useState(false);
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  const createMut = useMutation({
    mutationFn: () => createFeature({ feature_key: key, feature_name: name, description: desc, is_enabled: true }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["features"] }); setCreateOpen(false); setKey(""); setName(""); setDesc(""); toast.success("创建成功"); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: deleteFeature,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["features"] }); toast.success("已删除"); },
    onError: (e) => toast.error(e.message),
  });

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editKey, setEditKey] = useState("");
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const editMut = useMutation({
    mutationFn: () => updateFeature(editKey, { feature_name: editName, description: editDesc }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["features"] }); setEditOpen(false); toast.success("已更新"); },
    onError: (e) => toast.error(e.message),
  });

  const toggleMut = useMutation({
    mutationFn: ({ featureKey, enabled }: { featureKey: string; enabled: boolean }) => updateFeature(featureKey, { is_enabled: enabled }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["features"] }); toast.success("状态已更新"); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="flex min-h-0 w-full flex-col gap-4 overflow-hidden">
      <div className="flex shrink-0 items-center justify-end">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-8 text-sm gap-1"><Plus className="h-3.5 w-3.5" />新建</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>新建内测功能</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1"><Label>Key</Label><Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="feature_key" /></div>
              <div className="space-y-1"><Label>名称</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="space-y-1"><Label>描述</Label><Input value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
            </div>
            <DialogFooter><Button onClick={() => createMut.mutate()} disabled={createMut.isPending}>创建</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>编辑 — {editKey}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>名称</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
            <div className="space-y-1"><Label>描述</Label><Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} /></div>
          </div>
          <DialogFooter><Button onClick={() => editMut.mutate()} disabled={editMut.isPending}>保存</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {isLoading ? <div className="flex min-h-0 flex-1 items-center justify-center"><p className="text-xs text-muted-foreground">加载中...</p></div> : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="admin-list-scroll min-h-0 flex-1 overflow-y-auto border rounded-lg divide-y">
            {features?.map((f) => (
              <div key={f.feature_key} className="flex items-center gap-3 px-3 py-1.5 hover:bg-muted/50 transition-colors group">
              <ToggleRight className={`h-4 w-4 shrink-0 ${f.is_enabled ? "text-emerald-500" : "text-muted-foreground"}`} />
              <span className="text-sm font-medium truncate min-w-0">{f.feature_name}</span>
              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 shrink-0 font-mono">{f.feature_key}</Badge>
              {f.description && <span className="text-xs text-muted-foreground truncate min-w-0 hidden md:block">{f.description}</span>}
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground shrink-0">
                {f.user_ids?.length > 0 && <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">{f.user_ids.length} 用户</Badge>}
                {f.role_ids?.length > 0 && <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">{f.role_ids.length} 角色</Badge>}
              </span>
              <div className="ml-auto flex items-center gap-1.5 shrink-0">
                <Switch
                  checked={f.is_enabled}
                  onCheckedChange={(v) => toggleMut.mutate({ featureKey: f.feature_key, enabled: v })}
                />
                <div className="flex items-center gap-0.5">
                  <WhitelistDialog feature={f} />
                  <RoleDialog feature={f} />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => { setEditKey(f.feature_key); setEditName(f.feature_name); setEditDesc(f.description || ""); setEditOpen(true); }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>确认删除</AlertDialogTitle>
                        <AlertDialogDescription>确定要删除「{f.feature_name}」吗？此操作不可撤销。</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={() => deleteMut.mutate(f.feature_key)}>删除</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              </div>
            ))}
            {(!features || features.length === 0) && <p className="text-xs text-muted-foreground py-4 text-center">暂无内测功能</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function parseIdList(input: string): number[] {
  return input
    .split(/[,\s\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map(Number)
    .filter((n) => !isNaN(n) && n > 0);
}

function WhitelistDialog({ feature }: { feature: Feature }) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [userIdInput, setUserIdInput] = useState("");
  const qc = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["whitelist", feature.feature_key, page],
    queryFn: () => getWhitelist(feature.feature_key, { page, page_size: 20 }),
    enabled: open,
  });

  const grantMut = useMutation({
    mutationFn: () => {
      const ids = parseIdList(userIdInput);
      return grantFeature(feature.feature_key, ids.length === 1 ? { user_id: ids[0] } : { user_ids: ids });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["whitelist", feature.feature_key] }); qc.invalidateQueries({ queryKey: ["features"] }); setUserIdInput(""); toast.success("已授权"); },
    onError: (e) => toast.error(e.message),
  });

  const revokeMut = useMutation({
    mutationFn: (uid: number) => revokeFeature(feature.feature_key, uid),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["whitelist", feature.feature_key] }); qc.invalidateQueries({ queryKey: ["features"] }); toast.success("已撤销"); },
    onError: (e) => toast.error(e.message),
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));
  const parsedIds = parseIdList(userIdInput);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-6 w-6"><Users className="h-3.5 w-3.5" /></Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-auto">
        <DialogHeader><DialogTitle>白名单 — {feature.feature_name}</DialogTitle></DialogHeader>

        <form onSubmit={(e) => { e.preventDefault(); if (parsedIds.length > 0) grantMut.mutate(); }} className="m-0.5 flex items-center gap-3 py-1">
          <Input placeholder="用户 ID，多个用逗号/空格分隔" value={userIdInput} onChange={(e) => setUserIdInput(e.target.value)} className="h-8 text-sm flex-1" />
          <Button type="submit" size="sm" variant="outline" className="h-8 text-sm gap-1 shrink-0" disabled={grantMut.isPending || parsedIds.length === 0}>
            <Plus className="h-3.5 w-3.5" />添加{parsedIds.length > 1 ? ` ${parsedIds.length}` : ""}
          </Button>
        </form>

        {isLoading ? <p className="text-xs text-muted-foreground py-4 text-center">加载中...</p>
        : isError ? <p className="text-xs text-destructive py-4 text-center">加载失败: {(error as Error)?.message || "未知错误"}</p>
        : (
          <div className="admin-list-scroll border rounded-lg divide-y">
            {data?.data?.map((u) => (
              <div key={u.user_id} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-muted/50 transition-colors group/row">
                <span className="text-sm font-mono shrink-0">#{u.user_id}</span>
                <span className="text-sm truncate flex-1 min-w-0">{u.real_name || "-"}</span>
                {u.student_id && <span className="text-xs text-muted-foreground shrink-0">{u.student_id}</span>}
                <Button size="icon" variant="ghost" className="h-5 w-5 text-destructive hover:text-destructive shrink-0" onClick={() => revokeMut.mutate(u.user_id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            {(!data?.data || data.data.length === 0) && <p className="text-xs text-muted-foreground py-4 text-center">暂无白名单用户</p>}
          </div>
        )}

        {total > 20 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">共 {total} 条 · 第 {page}/{totalPages} 页</p>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" className="h-8 text-sm px-2" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
              <Button size="sm" variant="outline" className="h-8 text-sm px-2" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>下一页</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RoleDialog({ feature }: { feature: Feature }) {
  const [open, setOpen] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [roleIdInput, setRoleIdInput] = useState("");
  const qc = useQueryClient();

  // 每次打开弹窗时重新请求 feature 详情，确保 role_ids 是最新的
  const { data: latest, isLoading: detailLoading } = useQuery({
    queryKey: ["feature", feature.feature_key],
    queryFn: () => getFeature(feature.feature_key),
    enabled: open,
  });

  const { data: allRoles, isLoading: rolesLoading, isError, error } = useQuery({
    queryKey: ["roles"],
    queryFn: listRoles,
    enabled: open,
  });

  const roleIds = latest?.role_ids ?? feature.role_ids ?? [];
  const isLoading = detailLoading || rolesLoading;

  const grantMut = useMutation({
    mutationFn: () => grantFeatureRole(feature.feature_key, { role_id: parseInt(selectedRoleId) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["feature", feature.feature_key] }); qc.invalidateQueries({ queryKey: ["features"] }); setSelectedRoleId(""); toast.success("角色授权成功"); },
    onError: (e) => toast.error(e.message),
  });

  const batchGrantMut = useMutation({
    mutationFn: () => {
      const ids = parseIdList(roleIdInput);
      return grantFeatureRole(feature.feature_key, ids.length === 1 ? { role_id: ids[0] } : { role_ids: ids });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["feature", feature.feature_key] }); qc.invalidateQueries({ queryKey: ["features"] }); setRoleIdInput(""); toast.success("批量角色授权成功"); },
    onError: (e) => toast.error(e.message),
  });

  const revokeMut = useMutation({
    mutationFn: (roleId: number) => revokeFeatureRole(feature.feature_key, roleId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["feature", feature.feature_key] }); qc.invalidateQueries({ queryKey: ["features"] }); toast.success("角色授权已撤销"); },
    onError: (e) => toast.error(e.message),
  });

  const assignedRoles = (allRoles ?? []).filter((r) => roleIds.includes(r.role.id));
  const availableRoles = (allRoles ?? []).filter((r) => !roleIds.includes(r.role.id));
  const parsedRoleIds = parseIdList(roleIdInput);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-6 w-6"><Shield className="h-3.5 w-3.5" /></Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-auto">
        <DialogHeader><DialogTitle>角色授权 — {feature.feature_name}</DialogTitle></DialogHeader>

        {isLoading ? <p className="text-xs text-muted-foreground py-4 text-center">加载中...</p>
        : isError ? <p className="text-xs text-destructive py-4 text-center">加载失败: {(error as Error)?.message || "未知错误"}</p>
        : (
          <>
            <div className="flex items-center gap-3 py-1">
              <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                <SelectTrigger className="h-8 text-sm flex-1">
                  <SelectValue placeholder="选择角色" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((r) => (
                    <SelectItem key={r.role.id} value={String(r.role.id)}>{r.role.name} ({r.role.role_tag})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" className="h-8 text-sm gap-1 shrink-0" disabled={grantMut.isPending || !selectedRoleId} onClick={() => grantMut.mutate()}>
                <Plus className="h-3.5 w-3.5" />添加
              </Button>
            </div>

            <div className="flex items-center gap-3 py-1">
              <Input placeholder="批量角色 ID，逗号/空格分隔" value={roleIdInput} onChange={(e) => setRoleIdInput(e.target.value)} className="h-8 text-sm flex-1" />
              <Button size="sm" variant="outline" className="h-8 text-sm gap-1 shrink-0" disabled={batchGrantMut.isPending || parsedRoleIds.length === 0} onClick={() => batchGrantMut.mutate()}>
                <Plus className="h-3.5 w-3.5" />批量{parsedRoleIds.length > 0 ? ` ${parsedRoleIds.length}` : ""}
              </Button>
            </div>

            <div className="admin-list-scroll border rounded-lg divide-y">
              {assignedRoles.map((r) => (
                <div key={r.role.id} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-muted/50 transition-colors">
                  <span className="text-sm font-medium truncate flex-1 min-w-0">{r.role.name}</span>
                  <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 shrink-0 font-mono">{r.role.role_tag}</Badge>
                  <Button size="icon" variant="ghost" className="h-5 w-5 text-destructive hover:text-destructive shrink-0" onClick={() => revokeMut.mutate(r.role.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {assignedRoles.length === 0 && <p className="text-xs text-muted-foreground py-4 text-center">暂无角色授权</p>}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
