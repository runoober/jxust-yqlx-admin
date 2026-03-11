import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { searchHeroes, createHero, updateHero, deleteHero } from "@/api/heroes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Pencil, Trash2, Eye, EyeOff, Plus, Trophy } from "lucide-react";
import { toast } from "sonner";
import type { Hero } from "@/types/api";

export default function HeroesPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({ queryKey: ["heroes", page], queryFn: () => searchHeroes({ page, size: 20 }) });
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [sort, setSort] = useState("0");

  const createMut = useMutation({
    mutationFn: () => createHero({ name, is_show: true, sort: parseInt(sort) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["heroes"] }); setCreateOpen(false); setName(""); setSort("0"); toast.success("创建成功"); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: deleteHero,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["heroes"] }); toast.success("已删除"); },
    onError: (e) => toast.error(e.message),
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="flex min-h-0 w-full flex-col gap-4 overflow-hidden">
      <div className="flex shrink-0 items-center justify-end">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8">
              <Plus className="h-3.5 w-3.5 mr-1" />新建
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>新建英雄</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1"><Label>名称</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="space-y-1"><Label>排序</Label><Input value={sort} onChange={(e) => setSort(e.target.value)} type="number" /></div>
            </div>
            <DialogFooter><Button onClick={() => createMut.mutate()} disabled={createMut.isPending || !name}>创建</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <p className="text-xs text-muted-foreground py-4 text-center">加载中...</p>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
          <div className="admin-list-scroll min-h-0 flex-1 overflow-y-auto border rounded-lg divide-y">
            {data?.data?.map((h, i) => (
              <HeroRow key={h.id} hero={h} rank={(page - 1) * 20 + i + 1} onDelete={() => deleteMut.mutate(h.id)} />
            ))}
            {(!data?.data || data.data.length === 0) && (
              <p className="text-xs text-muted-foreground py-4 text-center">暂无数据</p>
            )}
          </div>

          {/* Pagination */}
          {total > 20 && (
            <div className="flex shrink-0 items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">{total} 条 · 第 {page}/{totalPages} 页</p>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" className="h-8 text-sm px-2" disabled={page <= 1} onClick={() => setPage(1)}>首页</Button>
                <Button size="sm" variant="outline" className="h-8 text-sm px-2" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
                <Button size="sm" variant="outline" className="h-8 text-sm px-2" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>下一页</Button>
                <Button size="sm" variant="outline" className="h-8 text-sm px-2" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>末页</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HeroRow({ hero, rank, onDelete }: { hero: Hero; rank: number; onDelete: () => void }) {
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState(hero.name);
  const [sort, setSort] = useState(String(hero.sort));
  const [isShow, setIsShow] = useState(hero.is_show);
  const qc = useQueryClient();

  const toggleMut = useMutation({
    mutationFn: () => updateHero(hero.id, { name: hero.name, is_show: !hero.is_show, sort: hero.sort }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["heroes"] }); toast.success(hero.is_show ? "已隐藏" : "已显示"); },
    onError: (e) => toast.error(e.message),
  });

  const editMut = useMutation({
    mutationFn: () => updateHero(hero.id, { name, is_show: isShow, sort: parseInt(sort) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["heroes"] }); setEditOpen(false); toast.success("已更新"); },
    onError: (e) => toast.error(e.message),
  });

  const resetEditForm = () => {
    setName(hero.name);
    setSort(String(hero.sort));
    setIsShow(hero.is_show);
  };

  const handleEditOpenChange = (open: boolean) => {
    if (!open) {
      resetEditForm();
    }
    setEditOpen(open);
  };

  return (
    <div className={`flex items-center justify-between gap-2 px-2.5 py-1.5 hover:bg-muted/50 transition-colors group [--admin-list-min-width:25rem] ${!hero.is_show ? "opacity-50" : ""}`}>
      <span className={`text-xs font-bold w-8 shrink-0 text-center ${rank <= 3 ? "text-orange-500" : "text-muted-foreground"}`}>
          {rank <= 3 ? <Trophy className="h-3.5 w-3.5 mx-auto" /> : rank}
      </span>
      <span className="text-sm font-medium truncate flex-1 max-w-40">{hero.name}</span>
      <span className="text-xs text-muted-foreground w-12 shrink-0 text-center">{hero.sort}</span>
      <span className="w-14 shrink-0 flex justify-center">
        <Badge variant={hero.is_show ? "default" : "secondary"} className="text-[10px] px-1.5 py-0 h-4">{hero.is_show ? "显示" : "隐藏"}</Badge>
      </span>
      <span className="text-xs text-muted-foreground w-20 shrink-0 text-right hidden md:inline">
        {new Date(hero.created_at).toLocaleDateString()}
      </span>
      <div className="w-20 shrink-0 flex items-center gap-0.5 justify-end">
        <div className="flex items-center gap-0.5">
          <Dialog open={editOpen} onOpenChange={handleEditOpenChange}>
            <DialogTrigger asChild>
              <Button size="icon" variant="ghost" className="h-6 w-6" title="编辑">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>编辑英雄</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1"><Label>名称</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
                <div className="space-y-1"><Label>排序</Label><Input value={sort} onChange={(e) => setSort(e.target.value)} type="number" /></div>
                <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">显示状态</p>
                    <p className="text-xs text-muted-foreground">控制该英雄是否在前台展示</p>
                  </div>
                  <Switch checked={isShow} onCheckedChange={setIsShow} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => editMut.mutate()} disabled={editMut.isPending || !name}>保存</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => toggleMut.mutate()} disabled={toggleMut.isPending} title={hero.is_show ? "隐藏" : "显示"}>
            {hero.is_show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive" title="删除">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确认删除</AlertDialogTitle>
                <AlertDialogDescription>确定要删除「{hero.name}」吗？此操作不可撤销。</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={onDelete}>删除</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
