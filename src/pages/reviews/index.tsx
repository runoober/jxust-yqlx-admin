import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listReviews, approveReview, rejectReview } from "@/api/reviews";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { MessageSquareText, ThumbsUp, ThumbsDown, Minus, Clock, Eye, ClipboardCheck, Search } from "lucide-react";
import type { TeacherReview } from "@/types/api";

const STATUS_CFG: Record<number, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; color: string }> = {
  1: { label: "待审核", variant: "outline", color: "text-amber-500" },
  2: { label: "已通过", variant: "default", color: "text-emerald-500" },
  3: { label: "已拒绝", variant: "destructive", color: "text-red-500" },
};

const ATTITUDE_CFG: Record<number, { label: string; icon: typeof ThumbsUp; color: string }> = {
  1: { label: "推荐", icon: ThumbsUp, color: "text-emerald-500" },
  2: { label: "避雷", icon: ThumbsDown, color: "text-red-500" },
  3: { label: "中立", icon: Minus, color: "text-muted-foreground" },
};

export default function ReviewsPage() {
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<string>("all");
  const [teacherName, setTeacherName] = useState("");
  const [teacherNameDraft, setTeacherNameDraft] = useState("");

  const status = tab === "all" ? undefined : parseInt(tab);
  const { data, isLoading } = useQuery({
    queryKey: ["reviews", page, status, teacherName],
    queryFn: () => listReviews({ page, size: 20, status, teacher_name: teacherName || undefined }),
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));
  const tabs = [
    { value: "all", label: "全部" },
    { value: "1", label: "待审核" },
    { value: "2", label: "已通过" },
    { value: "3", label: "已拒绝" },
  ];

  return (
    <div className="flex min-h-0 w-full flex-col gap-4 overflow-hidden">
      <div className="shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
        <form
          className="m-0.5 flex items-center gap-3 py-1"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setTeacherName(teacherNameDraft.trim());
          }}
        >
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="搜索教师..."
              value={teacherNameDraft}
              onChange={(e) => setTeacherNameDraft(e.target.value)}
              className="h-8 w-40 pl-7 text-sm"
            />
          </div>
          <Button type="submit" size="sm" variant="outline" className="h-8 text-sm">
            查询
          </Button>
        </form>
        {/* segmented tab control */}
        <div className="flex items-center border rounded-lg overflow-hidden h-8 text-sm">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => { setTab(t.value); setPage(1); }}
            className={`px-3 h-full transition-colors ${tab === t.value ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            {t.label}
          </button>
        ))}
        </div>
      </div>
      </div>

      {isLoading ? <div className="flex min-h-0 flex-1 items-center justify-center"><p className="text-xs text-muted-foreground">加载中...</p></div> : (
        <>
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
            <div className="admin-list-scroll min-h-0 flex-1 overflow-y-auto border rounded-lg divide-y">
            {data?.data?.map((r) => <ReviewRow key={r.id} review={r} />)}
            {(!data?.data || data.data.length === 0) && (
              <p className="text-xs text-muted-foreground py-6 text-center">暂无评价</p>
            )}
            </div>

            {total > 0 && (
              <div className="flex shrink-0 items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">共 {total} 条 · 第 {page}/{totalPages} 页</p>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="outline" className="h-8 text-sm px-2" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
                  <Button size="sm" variant="outline" className="h-8 text-sm px-2" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>下一页</Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ReviewRow({ review: r }: { review: TeacherReview }) {
  const sCfg = STATUS_CFG[r.status] ?? { label: "未知", variant: "outline" as const, color: "text-muted-foreground" };
  const aCfg = ATTITUDE_CFG[r.attitude] ?? { label: String(r.attitude), icon: Minus, color: "text-muted-foreground" };
  const AttIcon = aCfg.icon;

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 hover:bg-muted/50 transition-colors group min-w-0">
      <MessageSquareText className={`h-4 w-4 shrink-0 ${sCfg.color}`} />
      <span className="text-sm font-medium truncate w-16 shrink-0">{r.teacher_name}</span>
      <span className="text-xs text-muted-foreground truncate w-24 shrink-0 hidden sm:block">{r.course_name}</span>
      <span className="text-xs text-muted-foreground truncate w-16 shrink-0 hidden lg:block">{r.campus || "-"}</span>
      <p className="text-xs text-muted-foreground truncate flex-1 min-w-0">{r.content}</p>
      <div className="flex items-center gap-1 shrink-0 w-12 justify-center">
        <AttIcon className={`h-3.5 w-3.5 ${aCfg.color}`} />
        <span className={`text-[10px] ${aCfg.color}`}>{aCfg.label}</span>
      </div>
      <Badge variant={sCfg.variant} className="text-[10px] px-1.5 py-0 h-4 shrink-0 w-12 justify-center">{sCfg.label}</Badge>
      <span className="text-[10px] text-muted-foreground shrink-0 hidden md:flex items-center gap-0.5 w-20">
        <Clock className="h-3 w-3" />{new Date(r.created_at).toLocaleDateString()}
      </span>
      <div className="flex items-center gap-0.5 shrink-0 w-12 justify-end">
        <ReviewDetailDialog review={r} />
        {r.status === 1 && <ReviewActionDialog review={r} />}
      </div>
    </div>
  );
}

function ReviewDetailDialog({ review: r }: { review: TeacherReview }) {
  const aCfg = ATTITUDE_CFG[r.attitude];
  const sCfg = STATUS_CFG[r.status];
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-6 w-6"><Eye className="h-3.5 w-3.5" /></Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2">评价详情 <Badge variant="outline" className="text-[10px] h-4">#{r.id}</Badge></DialogTitle></DialogHeader>
        <div className="admin-list-scroll border rounded-lg divide-y">
          {[
            { label: "教师", value: r.teacher_name },
            { label: "课程", value: r.course_name },
            { label: "校区", value: r.campus || "-" },
            { label: "态度", value: <span className={aCfg?.color}>{aCfg?.label ?? r.attitude}</span> },
            { label: "状态", value: <Badge variant={sCfg?.variant}>{sCfg?.label}</Badge> },
            { label: "时间", value: new Date(r.created_at).toLocaleString() },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between px-2.5 py-1.5">
              <span className="text-xs text-muted-foreground">{item.label}</span>
              <span className="text-sm">{item.value}</span>
            </div>
          ))}
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">评价内容</p>
          <div className="border rounded-lg p-2.5 text-sm whitespace-pre-wrap max-h-48 overflow-auto">{r.content}</div>
        </div>
        {r.admin_note && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">管理员备注</p>
            <div className="border rounded-lg p-2.5 text-sm bg-muted/30">{r.admin_note}</div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ReviewActionDialog({ review: r }: { review: TeacherReview }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const qc = useQueryClient();

  const approveMut = useMutation({
    mutationFn: () => approveReview(r.id, { admin_note: note }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["reviews"] }); setOpen(false); toast.success("已通过"); },
    onError: (e) => toast.error(e.message),
  });

  const rejectMut = useMutation({
    mutationFn: () => rejectReview(r.id, { admin_note: note }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["reviews"] }); setOpen(false); toast.success("已拒绝"); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-6 w-6"><ClipboardCheck className="h-3.5 w-3.5" /></Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>审核评价 #{r.id}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">{r.teacher_name}</span>
            <span className="text-muted-foreground">· {r.course_name}</span>
          </div>
          <div className="border rounded-lg p-2.5 text-sm max-h-40 overflow-auto whitespace-pre-wrap">{r.content}</div>
          <div className="space-y-1">
            <Label className="text-xs">管理员备注</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="可选" className="h-8 text-sm" />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive gap-1" onClick={() => rejectMut.mutate()} disabled={rejectMut.isPending}>
            <ThumbsDown className="h-3.5 w-3.5" />拒绝
          </Button>
          <Button size="sm" className="gap-1" onClick={() => approveMut.mutate()} disabled={approveMut.isPending}>
            <ThumbsUp className="h-3.5 w-3.5" />通过
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
