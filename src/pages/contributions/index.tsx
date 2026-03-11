import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listContributions, reviewContribution, getContributionStatsAdmin } from "@/api/contributions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Send,
  Clock,
  Check,
  X,
  Eye,
  ShieldCheck,
  User,
  Tag,
  Star,
  FileText,
  Award,
} from "lucide-react";
import type { Contribution } from "@/types/api";

const STATUS_MAP: Record<number, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  1: { label: "待审核", variant: "outline" },
  2: { label: "已通过", variant: "default" },
  3: { label: "已拒绝", variant: "destructive" },
};

export default function ContributionsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"all" | "1" | "2" | "3">("all");

  const status = statusFilter === "all" ? undefined : parseInt(statusFilter);
  const { data, isLoading } = useQuery({
    queryKey: ["contributions", page, status],
    queryFn: () => listContributions({ page, size: 20, status }),
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="flex min-h-0 w-full flex-col gap-4 overflow-hidden">
      {/* Stats */}
      <StatsCards />

      {/* Filter */}
      <div className="flex h-8 w-fit shrink-0 items-center overflow-hidden rounded-lg border text-sm">
        {([["all", "全部"], ["1", "待审核"], ["2", "已通过"], ["3", "已拒绝"]] as const).map(([v, label]) => (
          <button key={v} onClick={() => { setStatusFilter(v); setPage(1); }} className={`px-3 h-full transition-colors ${statusFilter === v ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <p className="text-xs text-muted-foreground py-4 text-center">加载中...</p>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
          <div className="admin-list-scroll min-h-0 flex-1 overflow-y-auto border rounded-lg divide-y">
            {data?.data?.map((c) => (
              <ContributionRow key={c.id} contribution={c} />
            ))}
            {(!data?.data || data.data.length === 0) && (
              <p className="text-xs text-muted-foreground py-4 text-center">暂无投稿</p>
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

function StatsCards() {
  const { data, isLoading } = useQuery({
    queryKey: ["contribution-stats"],
    queryFn: getContributionStatsAdmin,
  });

  if (isLoading) return <p className="text-xs text-muted-foreground">加载中...</p>;
  if (!data) return null;

  const items = [
    { label: "总投稿", value: data.total_count, color: "text-amber-500", icon: Send },
    { label: "待审核", value: data.pending_count, color: "text-blue-500", icon: Clock },
    { label: "已通过", value: data.approved_count, color: "text-emerald-500", icon: Check },
    { label: "已拒绝", value: data.rejected_count, color: "text-rose-500", icon: X },
    { label: "总积分", value: data.total_points, color: "text-violet-500", icon: Award },
  ];

  return (
    <div className="shrink-0 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => (
        <div key={item.label} className="border rounded-lg px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
            {item.label}
          </div>
          <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function ContributionRow({ contribution: c }: { contribution: Contribution }) {
  const s = STATUS_MAP[c.status] ?? { label: "未知", variant: "outline" as const };

  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-muted/50 transition-colors group">
      <span className="text-xs text-muted-foreground w-8 shrink-0 text-center">#{c.id}</span>
      <span className="text-sm truncate flex-1 min-w-40 font-medium">{c.title}</span>
      <div className="hidden md:flex gap-1 w-24 shrink-0 justify-end">
        {c.categories?.map((cat) => (
          <Badge key={cat.id} variant="secondary" className="text-[10px] px-1 py-0 h-4">{cat.name}</Badge>
        ))}
      </div>
      <span className="text-xs text-muted-foreground w-20 shrink-0 truncate flex items-center gap-0.5">
        <User className="h-3 w-3 shrink-0" />#{c.user_id}
      </span>
      <span className="w-14 shrink-0 flex justify-center">
        <Badge variant={s.variant} className="text-[10px] px-1.5 py-0 h-4">{s.label}</Badge>
      </span>
      <span className="w-12 shrink-0 text-xs text-right">
        {c.points_awarded > 0 ? (
          <span className="text-violet-500 font-medium inline-flex items-center gap-0.5 justify-end">
            <Star className="h-3 w-3" />{c.points_awarded}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </span>
      <span className="text-xs text-muted-foreground w-20 shrink-0 text-right hidden md:inline">
        {new Date(c.created_at).toLocaleDateString()}
      </span>
      <div className="flex items-center gap-0.5 w-14 shrink-0 justify-end">
        <ContributionDetailDialog contribution={c} />
        {c.status === 1 && <ReviewDialog contribution={c} />}
      </div>
    </div>
  );
}

function ContributionDetailDialog({ contribution: c }: { contribution: Contribution }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-6 w-6" title="详情">
          <Eye className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] w-[calc(100vw-2rem)] max-w-2xl overflow-auto">
        <DialogHeader><DialogTitle className="wrap-break-word pr-6">{c.title}</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm min-w-0">
          <div className="prose prose-sm max-w-none wrap-break-word whitespace-pre-wrap **:wrap-break-word" dangerouslySetInnerHTML={{ __html: c.content }} />
          {/* Meta info */}
          <div className="border rounded-lg divide-y text-xs overflow-hidden">
            <div className="flex gap-1 px-2.5 py-1.5 items-center">
              <User className="h-3 w-3 text-amber-500" />
              <span className="text-muted-foreground">投稿者</span>
              <span className="font-medium break-all ml-auto">#{c.user_id}</span>
            </div>
            {c.reviewer && (
              <div className="flex gap-1 px-2.5 py-1.5 items-center">
                <ShieldCheck className="h-3 w-3 text-teal-500" />
                <span className="text-muted-foreground">审核人</span>
                <span className="font-medium break-all ml-auto">{c.reviewer.nickname} #{c.reviewer_id}</span>
              </div>
            )}
            {c.review_note && (
              <div className="flex gap-1 px-2.5 py-1.5 items-start">
                <FileText className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">审核备注</span>
                <span className="wrap-break-word whitespace-pre-wrap ml-auto">{c.review_note}</span>
              </div>
            )}
            {c.points_awarded > 0 && (
              <div className="flex gap-1 px-2.5 py-1.5 items-center">
                <Star className="h-3 w-3 text-violet-500" />
                <span className="text-muted-foreground">奖励积分</span>
                <span className="font-bold text-violet-500 ml-auto">{c.points_awarded}</span>
              </div>
            )}
            <div className="flex gap-1 px-2.5 py-1.5 items-center">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">提交</span>
              <span className="wrap-break-word ml-auto">{new Date(c.created_at).toLocaleString()}</span>
            </div>
            {c.reviewed_at && (
              <div className="flex gap-1 px-2.5 py-1.5 items-center">
                <Check className="h-3 w-3 text-emerald-500" />
                <span className="text-muted-foreground">审核</span>
                <span className="wrap-break-word ml-auto">{new Date(c.reviewed_at).toLocaleString()}</span>
              </div>
            )}
          </div>
          {c.categories?.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <Tag className="h-3.5 w-3.5 text-muted-foreground" />
              {c.categories.map((cat) => (
                <Badge key={cat.id} variant="secondary" className="text-xs">{cat.name}</Badge>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReviewDialog({ contribution: c }: { contribution: Contribution }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [points, setPoints] = useState("10");
  const [title, setTitle] = useState(c.title);
  const [content, setContent] = useState(c.content);
  const qc = useQueryClient();

  const mut = useMutation({
    mutationFn: (status: 2 | 3) =>
      reviewContribution(c.id, {
        status,
        review_note: note,
        points: status === 2 ? parseInt(points) : 0,
        title,
        content,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contributions"] });
      qc.invalidateQueries({ queryKey: ["contribution-stats"] });
      setOpen(false);
      toast.success("审核完成");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-6 w-6" title="审核">
          <ShieldCheck className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>审核投稿 #{c.id}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>标题(可修改)</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="space-y-1"><Label>内容(可修改)</Label><Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} /></div>
          <div className="space-y-1"><Label>奖励积分</Label><Input value={points} onChange={(e) => setPoints(e.target.value)} type="number" /></div>
          <div className="space-y-1"><Label>审核备注</Label><Input value={note} onChange={(e) => setNote(e.target.value)} /></div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="destructive" size="sm" onClick={() => mut.mutate(3)} disabled={mut.isPending}>
            <X className="h-3.5 w-3.5 mr-1" />拒绝
          </Button>
          <Button size="sm" onClick={() => mut.mutate(2)} disabled={mut.isPending}>
            <Check className="h-3.5 w-3.5 mr-1" />通过
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
