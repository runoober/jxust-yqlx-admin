import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { searchConfigs, createConfig, updateConfig, deleteConfig } from "@/api/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Settings, Plus, Pencil, Trash2, Key } from "lucide-react";
import type { ConfigResponse } from "@/types/api";

const TYPE_COLORS: Record<string, string> = {
  string: "text-blue-500",
  number: "text-violet-500",
  json: "text-amber-500",
  boolean: "text-emerald-500",
};

export default function ConfigPage() {
  const qc = useQueryClient();
  const { data: configsResult, isLoading } = useQuery({ queryKey: ["configs"], queryFn: () => searchConfigs({ page: 1, size: 100 }) });
  const configs = configsResult?.data;
  const [createOpen, setCreateOpen] = useState(false);
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [valueType, setValueType] = useState("string");
  const [desc, setDesc] = useState("");

  const createMut = useMutation({
    mutationFn: () => createConfig({ key, value, value_type: valueType, description: desc }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["configs"] }); setCreateOpen(false); setKey(""); setValue(""); setDesc(""); toast.success("创建成功"); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: deleteConfig,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["configs"] }); toast.success("已删除"); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="flex min-h-0 w-full flex-col gap-4 overflow-hidden">
      <div className="flex shrink-0 items-center justify-end">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8"><Plus className="h-3.5 w-3.5 mr-1" />新建配置</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>新建配置</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1"><Label>Key</Label><Input value={key} onChange={(e) => setKey(e.target.value)} /></div>
              <div className="space-y-1"><Label>Value</Label><Textarea value={value} onChange={(e) => setValue(e.target.value)} /></div>
              <div className="space-y-1">
                <Label>类型</Label>
                <div className="flex items-center border rounded-lg overflow-hidden h-8 text-sm w-fit">
                  {["string", "number", "json", "boolean"].map((t) => (
                    <button key={t} onClick={() => setValueType(t)} className={`px-3 h-full transition-colors ${valueType === t ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{t}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-1"><Label>描述</Label><Input value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
            </div>
            <DialogFooter><Button onClick={() => createMut.mutate()} disabled={createMut.isPending || !key}>创建</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="shrink-0 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "总配置", value: configs?.length ?? 0, color: "text-blue-500", icon: Settings },
          ...["string", "number", "json", "boolean"].map((t) => ({
            label: t,
            value: configs?.filter((c) => c.value_type === t).length ?? 0,
            color: TYPE_COLORS[t] ?? "text-muted-foreground",
            icon: Key,
          })),
        ].slice(0, 4).map((item) => (
          <div key={item.label} className="border rounded-lg px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
              {item.label}
            </div>
            <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <p className="text-xs text-muted-foreground py-4 text-center">加载中...</p>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="admin-list-scroll min-h-0 flex-1 overflow-y-auto border rounded-lg divide-y">
            {configs?.map((c) => (
              <ConfigRow key={c.key} config={c} onDelete={() => deleteMut.mutate(c.key)} />
            ))}
            {(!configs || configs.length === 0) && (
              <p className="text-xs text-muted-foreground py-4 text-center">暂无配置</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ConfigRow({ config, onDelete }: { config: ConfigResponse; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(config.value);
  const [desc, setDesc] = useState(config.description);
  const qc = useQueryClient();

  const mut = useMutation({
    mutationFn: () => updateConfig(config.key, { value, value_type: config.value_type, description: desc }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["configs"] }); setOpen(false); toast.success("已更新"); },
    onError: (e) => toast.error(e.message),
  });

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) { setValue(config.value); setDesc(config.description); }
  };

  const typeColor = TYPE_COLORS[config.value_type] ?? "text-muted-foreground";

  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-muted/50 transition-colors group">
      <span className="w-40 shrink-0 flex items-center gap-1">
        <Key className={`h-3 w-3 ${typeColor} shrink-0`} />
        <span className="text-sm font-medium font-mono truncate">{config.key}</span>
      </span>
      <span className="text-xs truncate flex-1 min-w-20 text-muted-foreground">{config.value}</span>
      <span className="w-16 shrink-0 flex justify-center">
        <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">{config.value_type}</Badge>
      </span>
      <span className="text-xs text-muted-foreground min-w-5 shrink-0 truncate hidden md:block">{config.description || "-"}</span>
      <div className="w-20 shrink-0 flex items-center gap-0.5 justify-end">
        <Dialog open={open} onOpenChange={handleOpen}>
          <DialogTrigger asChild>
            <Button size="icon" variant="ghost" className="h-6 w-6" title="编辑">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>编辑: {config.key}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">{config.value_type}</Badge>
                {config.description && <span>{config.description}</span>}
              </div>
              <div className="space-y-1"><Label>Value</Label><Textarea value={value} onChange={(e) => setValue(e.target.value)} rows={4} className="font-mono text-sm" /></div>
              <div className="space-y-1"><Label>描述</Label><Input value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
            </div>
            <DialogFooter><Button onClick={() => mut.mutate()} disabled={mut.isPending}>保存</Button></DialogFooter>
          </DialogContent>
        </Dialog>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive" title="删除">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除</AlertDialogTitle>
              <AlertDialogDescription>确定要删除配置「{config.key}」吗？此操作不可撤销。</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={onDelete}>删除</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
