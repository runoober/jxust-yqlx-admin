import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createFailRate,
  deleteFailRate,
  listFailRates,
  updateFailRate,
  type FailRatePayload,
} from "@/api/failrates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { FailRate } from "@/types/api";

const PAGE_SIZE = 20;

function formatFailRate(value: number) {
  if (Number.isNaN(value)) return "-";
  return value <= 1 ? `${(value * 100).toFixed(2)}%` : `${value.toFixed(2)}%`;
}

export default function FailRatesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [keywordDraft, setKeywordDraft] = useState("");
  const [department, setDepartment] = useState("");
  const [departmentDraft, setDepartmentDraft] = useState("");
  const [semester, setSemester] = useState("");
  const [semesterDraft, setSemesterDraft] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["failrates", page, keyword, department, semester],
    queryFn: () =>
      listFailRates({
        page,
        page_size: PAGE_SIZE,
        keyword: keyword || undefined,
        department: department || undefined,
        semester: semester || undefined,
      }),
  });

  const createMut = useMutation({
    mutationFn: (payload: FailRatePayload) => createFailRate(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["failrates"] });
      setCreateOpen(false);
      toast.success("挂科率已创建");
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteFailRate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["failrates"] });
      toast.success("挂科率已删除");
    },
    onError: (error) => toast.error(error.message),
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex min-h-0 w-full flex-col gap-4 overflow-hidden">
      <div className="shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
        <form
          className="m-0.5 flex items-center gap-3 flex-wrap py-1"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setKeyword(keywordDraft.trim());
            setDepartment(departmentDraft.trim());
            setSemester(semesterDraft.trim());
          }}
        >
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keywordDraft}
              onChange={(event) => setKeywordDraft(event.target.value)}
              placeholder="搜索课程"
              className="h-8 w-44 pl-7 text-sm"
            />
          </div>
          <Input
            value={departmentDraft}
            onChange={(event) => setDepartmentDraft(event.target.value)}
            placeholder="开课单位"
            className="h-8 w-40 text-sm"
          />
          <Input
            value={semesterDraft}
            onChange={(event) => setSemesterDraft(event.target.value)}
            placeholder="学期"
            className="h-8 w-36 text-sm"
          />
          <Button type="submit" size="sm" variant="outline" className="h-8 text-sm">
            查询
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button type="button" size="sm" className="ml-auto h-8 gap-1 text-sm">
              <Plus className="h-3.5 w-3.5" />
              新建挂科率
            </Button>
          </DialogTrigger>
          <FailRateEditor
            title="新建挂科率"
            confirmText="创建"
            loading={createMut.isPending}
            onSubmit={(payload) => createMut.mutate(payload)}
          />
        </Dialog>
        </form>
      </div>
      </div>

      {isLoading ? (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">加载中...</p>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
          <div className="admin-list-scroll min-h-0 flex-1 overflow-y-auto border rounded-lg divide-y">
            {data?.data.map((item) => (
              <FailRateRow
                key={item.id}
                item={item}
                onDelete={() => deleteMut.mutate(item.id)}
              />
            ))}
            {(!data?.data || data.data.length === 0) && (
              <p className="py-8 text-center text-sm text-muted-foreground">暂无挂科率数据</p>
            )}
          </div>

          {total > PAGE_SIZE && (
            <div className="flex shrink-0 items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                共 {total} 条 · 第 {page}/{totalPages} 页
              </p>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2 text-sm"
                  disabled={page <= 1}
                  onClick={() => setPage(1)}
                >
                  首页
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2 text-sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  上一页
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2 text-sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  下一页
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2 text-sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(totalPages)}
                >
                  末页
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FailRateRow({ item, onDelete }: { item: FailRate; onDelete: () => void }) {
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const updateMut = useMutation({
    mutationFn: (payload: FailRatePayload) => updateFailRate(item.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["failrates"] });
      setEditOpen(false);
      toast.success("挂科率已更新");
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="group flex items-center justify-between gap-2 px-3 py-1.5 hover:bg-muted/40 transition-colors">
      <span className="w-30 shrink-0 truncate text-sm font-medium">{item.course_name}</span>
      <span className="w-40 shrink-0 truncate text-xs text-muted-foreground">{item.department}</span>
      <Badge variant="outline" className="shrink-0 justify-center text-[10px]">
        {item.semester}
      </Badge>
      <span className="w-24 shrink-0 text-center text-xs font-semibold text-amber-600">
        {formatFailRate(item.failrate)}
      </span>
      <span className="w-20 shrink-0 text-right text-xs text-muted-foreground hidden md:inline">
        {new Date(item.updated_at).toLocaleDateString()}
      </span>
      <div className="flex w-20 shrink-0 items-center justify-end gap-0.5">
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger asChild>
            <Button size="icon" variant="ghost" className="h-6 w-6">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </DialogTrigger>
          <FailRateEditor
            title={`编辑挂科率 #${item.id}`}
            confirmText="保存"
            loading={updateMut.isPending}
            initialValue={item}
            onSubmit={(payload) => updateMut.mutate(payload)}
          />
        </Dialog>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除挂科率</AlertDialogTitle>
              <AlertDialogDescription>
                将删除课程 {item.course_name} 的挂科率记录。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={onDelete}>
                删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function FailRateEditor({
  title,
  confirmText,
  loading,
  initialValue,
  onSubmit,
}: {
  title: string;
  confirmText: string;
  loading: boolean;
  initialValue?: FailRate;
  onSubmit: (payload: FailRatePayload) => void;
}) {
  const [courseName, setCourseName] = useState(initialValue?.course_name ?? "");
  const [department, setDepartment] = useState(initialValue?.department ?? "");
  const [semester, setSemester] = useState(initialValue?.semester ?? "");
  const [failrate, setFailrate] = useState(String(initialValue?.failrate ?? ""));

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1">
          <Label>课程名称</Label>
          <Input value={courseName} onChange={(event) => setCourseName(event.target.value)} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label>开课单位</Label>
            <Input value={department} onChange={(event) => setDepartment(event.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>学期</Label>
            <Input value={semester} onChange={(event) => setSemester(event.target.value)} />
          </div>
        </div>
        <div className="space-y-1">
          <Label>挂科率</Label>
          <Input value={failrate} onChange={(event) => setFailrate(event.target.value)} type="number" step="0.01" />
        </div>
      </div>
      <DialogFooter>
        <Button
          onClick={() =>
            onSubmit({
              course_name: courseName.trim(),
              department: department.trim(),
              semester: semester.trim(),
              failrate: Number(failrate),
            })
          }
          disabled={
            loading ||
            !courseName.trim() ||
            !department.trim() ||
            !semester.trim() ||
            failrate.trim() === ""
          }
        >
          {confirmText}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
