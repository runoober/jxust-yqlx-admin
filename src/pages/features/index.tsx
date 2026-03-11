import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listFeatures,
  createFeature,
  updateFeature,
  deleteFeature,
  getWhitelist,
  grantFeature,
  revokeFeature,
} from "@/api/features";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ToggleRight, Plus, Users, Trash2 } from "lucide-react";
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

      {isLoading ? <div className="flex min-h-0 flex-1 items-center justify-center"><p className="text-xs text-muted-foreground">加载中...</p></div> : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="admin-list-scroll min-h-0 flex-1 overflow-y-auto border rounded-lg divide-y">
            {features?.map((f) => (
              <div key={f.feature_key} className="flex items-center gap-3 px-3 py-1.5 hover:bg-muted/50 transition-colors group">
              <ToggleRight className={`h-4 w-4 shrink-0 ${f.is_enabled ? "text-emerald-500" : "text-muted-foreground"}`} />
              <span className="text-sm font-medium truncate min-w-0">{f.feature_name}</span>
              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 shrink-0 font-mono">{f.feature_key}</Badge>
              {f.description && <span className="text-xs text-muted-foreground truncate min-w-0 hidden md:block">{f.description}</span>}
              <div className="ml-auto flex items-center gap-1.5 shrink-0">
                <Switch
                  checked={f.is_enabled}
                  onCheckedChange={(v) => toggleMut.mutate({ featureKey: f.feature_key, enabled: v })}
                />
                <div className="flex items-center gap-0.5">
                  <WhitelistDialog feature={f} />
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

function WhitelistDialog({ feature }: { feature: Feature }) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [userId, setUserId] = useState("");
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["whitelist", feature.feature_key, page],
    queryFn: () => getWhitelist(feature.feature_key, { page, page_size: 20 }),
    enabled: open,
  });

  const grantMut = useMutation({
    mutationFn: () => grantFeature(feature.feature_key, { user_id: parseInt(userId) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["whitelist", feature.feature_key] }); setUserId(""); toast.success("已授权"); },
    onError: (e) => toast.error(e.message),
  });

  const revokeMut = useMutation({
    mutationFn: (uid: number) => revokeFeature(feature.feature_key, uid),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["whitelist", feature.feature_key] }); toast.success("已撤销"); },
    onError: (e) => toast.error(e.message),
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-6 w-6"><Users className="h-3.5 w-3.5" /></Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-auto">
        <DialogHeader><DialogTitle>白名单 — {feature.feature_name}</DialogTitle></DialogHeader>

        <form onSubmit={(e) => { e.preventDefault(); grantMut.mutate(); }} className="m-0.5 flex items-center gap-3 py-1">
          <Input placeholder="用户 ID" value={userId} onChange={(e) => setUserId(e.target.value)} type="number" className="h-8 text-sm flex-1" />
          <Button type="submit" size="sm" variant="outline" className="h-8 text-sm gap-1" disabled={grantMut.isPending || !userId}>
            <Plus className="h-3.5 w-3.5" />添加
          </Button>
        </form>

        {isLoading ? <p className="text-xs text-muted-foreground py-4 text-center">加载中...</p> : (
          <div className="admin-list-scroll border rounded-lg divide-y">
            {data?.data?.map((u) => (
              <div key={u.id} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-muted/50 transition-colors group/row">
                <span className="text-sm font-mono shrink-0">#{u.user_id}</span>
                <span className="text-sm truncate flex-1 min-w-0">{u.real_name || "-"}</span>
                {u.student_id && <span className="text-xs text-muted-foreground shrink-0">{u.student_id}</span>}
                <span className="text-xs text-muted-foreground shrink-0 hidden md:block">{new Date(u.granted_at).toLocaleDateString()}</span>
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
