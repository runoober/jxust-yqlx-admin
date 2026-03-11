import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listNotifications,
  getNotification,
  createNotification,
  updateNotification,
  deleteNotification,
  approveNotification,
  publishNotification,
  publishAdminNotification,
  pinNotification,
  unpinNotification,
  listCategories,
  createCategory,
  updateCategory,
  getNotificationStats,
} from "@/api/notifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useAuthStore } from "@/hooks/use-auth";
import {
  Bell,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Pin,
  PinOff,
  Send,
  ShieldCheck,
  Check,
  X,
  FileText,
  Tag,
  Clock,
  Users,
} from "lucide-react";
import type { Notification, NotificationCategory } from "@/types/api";

const STATUS_MAP: Record<number, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  1: { label: "草稿", variant: "secondary" },
  2: { label: "待审核", variant: "outline" },
  3: { label: "已发布", variant: "default" },
};

export default function NotificationsPage() {
  const [tab, setTab] = useState<"list" | "categories">("list");

  return (
    <div className="flex min-h-0 w-full flex-col gap-4 overflow-hidden">
      <div className="shrink-0 flex items-center gap-2">
          <div className="flex items-center border rounded-lg overflow-hidden h-8 text-sm">
            <button onClick={() => setTab("list")} className={`px-3 h-full flex items-center gap-1 transition-colors ${tab === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
              <Bell className="h-3.5 w-3.5" />通知列表
            </button>
            <button onClick={() => setTab("categories")} className={`px-3 h-full flex items-center gap-1 transition-colors ${tab === "categories" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
              <Tag className="h-3.5 w-3.5" />分类管理
            </button>
          </div>
      </div>

      {/* Stats cards */}
      <StatsCards />

      {tab === "list" && <NotificationListTab />}
      {tab === "categories" && <CategoriesTab />}
    </div>
  );
}

function StatsCards() {
  const { data, isLoading } = useQuery({
    queryKey: ["notification-stats"],
    queryFn: getNotificationStats,
  });

  if (isLoading) return <p className="text-xs text-muted-foreground">加载中...</p>;
  if (!data) return null;

  const items = [
    { label: "总通知", value: data.total_count, color: "text-blue-500", icon: Bell },
    { label: "草稿", value: data.draft_count, color: "text-muted-foreground", icon: FileText },
    { label: "待审核", value: data.pending_count, color: "text-amber-500", icon: Clock },
    { label: "已发布", value: data.published_count, color: "text-emerald-500", icon: Send },
  ];

  return (
    <div className="shrink-0 grid grid-cols-2 gap-3 md:grid-cols-4">
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

function NotificationListTab() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"1" | "2" | "3">("1");
  const qc = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id);

  const status = parseInt(statusFilter);
  const { data, isLoading } = useQuery({
    queryKey: ["notifications", page, status],
    queryFn: () => listNotifications({ page, size: 20, status }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notifications"] }); qc.invalidateQueries({ queryKey: ["notification-stats"] }); toast.success("已删除"); },
    onError: (e) => toast.error(e.message),
  });

  const publishMut = useMutation({
    mutationFn: publishNotification,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notifications"] }); qc.invalidateQueries({ queryKey: ["notification-stats"] }); toast.success("已发布"); },
    onError: (e) => toast.error(e.message),
  });

  const publishAdminMut = useMutation({
    mutationFn: publishAdminNotification,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notifications"] }); qc.invalidateQueries({ queryKey: ["notification-stats"] }); toast.success("管理员直接发布成功"); },
    onError: (e) => toast.error(e.message),
  });

  const pinMut = useMutation({
    mutationFn: ({ id, pin }: { id: number; pin: boolean }) => pin ? pinNotification(id) : unpinNotification(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notifications"] }); toast.success("操作成功"); },
    onError: (e) => toast.error(e.message),
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      {/* Filter bar */}
      <div className="flex shrink-0 items-center justify-between gap-2">
        <div className="flex items-center border rounded-lg overflow-hidden h-8 text-sm">
          {(["1", "2", "3"] as const).map((v) => (
            <button key={v} onClick={() => { setStatusFilter(v); setPage(1); }} className={`px-3 h-full transition-colors ${statusFilter === v ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
              {STATUS_MAP[parseInt(v)].label}
            </button>
          ))}
        </div>
        <CreateNotificationDialog />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <p className="text-xs text-muted-foreground py-4 text-center">加载中...</p>
        </div>
      ) : (
        <>
          <div className="flex-1 min-h-0 overflow-y-auto admin-list-scroll border rounded-lg divide-y">
            {data?.data?.map((n) => {
              const s = STATUS_MAP[n.status] ?? { label: "未知", variant: "outline" as const };
              return (
                <div key={n.id} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-muted/50 transition-colors group">
                  <span className="text-xs text-muted-foreground w-8 shrink-0 text-center">#{n.id}</span>
                  <span className="w-4 shrink-0 flex justify-center">
                    {n.is_pinned && <Pin className="h-3 w-3 text-amber-500" />}
                  </span>
                  <span className="text-sm truncate flex-1 min-w-40 font-medium">{n.title}</span>
                  <div className="flex gap-0.5 max-w-40 justify-start overflow-hidden">
                    {n.categories?.map((c) => (
                      <Badge key={c.id} variant="secondary" className="text-[10px] px-0.5 py-0 h-4 truncate max-w-10">{c.name}</Badge>
                    ))}
                  </div>
                  <span className="w-14 shrink-0 flex justify-center">
                    <Badge variant={s.variant} className="text-[10px] px-1.5 py-0 h-4">{s.label}</Badge>
                  </span>
                  <span className="text-xs text-muted-foreground w-12 shrink-0 flex items-center gap-0.5 justify-end">
                    <Eye className="h-3 w-3" />{n.view_count}
                  </span>
                  <span className="text-xs text-muted-foreground w-20 shrink-0 text-right hidden md:inline">
                    {new Date(n.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <NotificationDetailDialog n={n} />
                    <EditNotificationDialog n={n} />
                    {n.status === 1 && (
                      <Button size="icon" variant="ghost" className="h-6 w-6" title="发布" onClick={() => publishMut.mutate(n.id)}>
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {(n.status === 1 || n.status === 2) && (
                      <Button size="icon" variant="ghost" className="h-6 w-6" title="直接发布" onClick={() => publishAdminMut.mutate(n.id)}>
                        <ShieldCheck className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className={`h-6 w-6 ${n.is_pinned ? "text-amber-500" : ""}`}
                      title={n.is_pinned ? "取消置顶" : "置顶"}
                      onClick={() => pinMut.mutate({ id: n.id, pin: !n.is_pinned })}
                    >
                      {n.is_pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                    </Button>
                    {n.status === 2 && <ApproveActions n={n} currentUserId={currentUserId} />}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>确认删除</AlertDialogTitle>
                          <AlertDialogDescription>确定要删除「{n.title}」吗？此操作不可撤销。</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>取消</AlertDialogCancel>
                          <AlertDialogAction variant="destructive" onClick={() => deleteMut.mutate(n.id)}>删除</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              );
            })}
            {(!data?.data || data.data.length === 0) && (
              <p className="text-xs text-muted-foreground py-4 text-center">暂无通知</p>
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
        </>
      )}
    </div>
  );
}

function ApproveActions({ n, currentUserId }: { n: Notification; currentUserId?: number }) {
  const isPending = n.approval_summary?.pending_users?.some((u) => u.id === currentUserId);
  const isApproved = n.approval_summary?.approved_users?.some((u) => u.id === currentUserId);
  const isRejected = n.approval_summary?.rejected_users?.some((u) => u.id === currentUserId);

  if (isPending) return <ApproveDialog notificationId={n.id} />;
  if (isApproved) return <span className="text-[10px] text-emerald-500 shrink-0">已审过</span>;
  if (isRejected) return <span className="text-[10px] text-destructive shrink-0">已审拒</span>;
  return null;
}

function NotificationDetailDialog({ n }: { n: Notification }) {
  const [open, setOpen] = useState(false);
  const { data: detail, isLoading } = useQuery({
    queryKey: ["notification-detail", n.id],
    queryFn: () => getNotification(n.id),
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-6 w-6" title="详情">
          <Eye className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{n.title}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <p className="text-xs text-muted-foreground py-4">加载中...</p>
        ) : detail ? (
          <div className="space-y-3 text-sm">
            <div className="prose prose-sm max-w-none whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: detail.content }} />
            {/* Meta info */}
            <div className="admin-list-scroll border rounded-lg divide-y text-xs">
              {detail.publisher && (
                <div className="flex items-center gap-2 px-2.5 py-1.5">
                  <Users className="h-3 w-3 text-blue-500" />
                  <span className="text-muted-foreground">发布者</span>
                  <span className="ml-auto font-medium">{detail.publisher.nickname} #{detail.publisher.id}</span>
                </div>
              )}
              {detail.contributor && (
                <div className="flex items-center gap-2 px-2.5 py-1.5">
                  <Users className="h-3 w-3 text-amber-500" />
                  <span className="text-muted-foreground">投稿者</span>
                  <span className="ml-auto font-medium">{detail.contributor.nickname} #{detail.contributor.id}</span>
                </div>
              )}
              <div className="flex items-center gap-2 px-2.5 py-1.5">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">创建</span>
                <span className="ml-auto">{new Date(detail.created_at).toLocaleString()}</span>
              </div>
              {detail.published_at && (
                <div className="flex items-center gap-2 px-2.5 py-1.5">
                  <Send className="h-3 w-3 text-emerald-500" />
                  <span className="text-muted-foreground">发布</span>
                  <span className="ml-auto">{new Date(detail.published_at).toLocaleString()}</span>
                </div>
              )}
              <div className="flex items-center gap-2 px-2.5 py-1.5">
                <Eye className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">浏览</span>
                <span className="ml-auto font-medium">{detail.view_count}</span>
              </div>
            </div>
            {detail.categories?.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                {detail.categories.map((c) => (
                  <Badge key={c.id} variant="secondary" className="text-xs">{c.name}</Badge>
                ))}
              </div>
            )}
            {detail.approval_summary && <ApprovalSummarySection summary={detail.approval_summary} />}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ApprovalSummarySection({ summary }: { summary: Notification["approval_summary"] & {} }) {
  const currentUserId = useAuthStore((s) => s.user?.id);

  const myStatus = summary.approved_users?.some((u) => u.id === currentUserId)
    ? "approved"
    : summary.rejected_users?.some((u) => u.id === currentUserId)
      ? "rejected"
      : summary.pending_users?.some((u) => u.id === currentUserId)
        ? "pending"
        : null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold flex items-center gap-1.5">
        <ShieldCheck className="h-4 w-4 text-teal-500" />审批信息
      </h4>
      <div className="admin-list-scroll border rounded-lg divide-y text-xs">
        {/* Summary row */}
        <div className="flex items-center gap-3 px-2.5 py-1.5">
          <span className="text-muted-foreground">通过</span>
          <span className="font-medium text-emerald-500">{summary.approved_count}/{summary.total_reviewers}</span>
          <span className="text-muted-foreground">拒绝</span>
          <span className="font-medium text-destructive">{summary.rejected_count}</span>
          <span className="text-muted-foreground">待审</span>
          <span className="font-medium">{summary.pending_count}</span>
        </div>
        {/* Rate */}
        <div className="flex items-center gap-2 px-2.5 py-1.5">
          <span className="text-muted-foreground">通过率</span>
          <span className="font-medium">{(summary.approval_rate * 100).toFixed(0)}%</span>
          <span className="text-muted-foreground">需 {(summary.required_rate * 100).toFixed(0)}%</span>
          <span className={`ml-auto font-medium ${summary.can_publish ? "text-emerald-500" : "text-muted-foreground"}`}>
            {summary.can_publish ? "可发布" : "不可发布"}
          </span>
        </div>
        {/* My status */}
        {myStatus && (
          <div className="flex items-center gap-2 px-2.5 py-1.5">
            <span className="text-muted-foreground">我的审批</span>
            <Badge variant={myStatus === "approved" ? "default" : myStatus === "rejected" ? "destructive" : "secondary"} className="text-[10px] px-1 py-0 h-4">
              {myStatus === "approved" ? "已通过" : myStatus === "rejected" ? "已拒绝" : "待审批"}
            </Badge>
          </div>
        )}
        {/* Users */}
        {(summary.approved_users?.length ?? 0) > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 flex-wrap">
            <span className="text-muted-foreground shrink-0">通过:</span>
            {summary.approved_users.map((u) => (
              <Badge key={u.id} variant="default" className="text-[10px] px-1 py-0 h-4">{u.nickname || `#${u.id}`}</Badge>
            ))}
          </div>
        )}
        {(summary.rejected_users?.length ?? 0) > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 flex-wrap">
            <span className="text-muted-foreground shrink-0">拒绝:</span>
            {summary.rejected_users.map((u) => (
              <Badge key={u.id} variant="destructive" className="text-[10px] px-1 py-0 h-4">{u.nickname || `#${u.id}`}</Badge>
            ))}
          </div>
        )}
        {(summary.pending_users?.length ?? 0) > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 flex-wrap">
            <span className="text-muted-foreground shrink-0">待审:</span>
            {summary.pending_users.map((u) => (
              <Badge key={u.id} variant="secondary" className="text-[10px] px-1 py-0 h-4">{u.nickname || `#${u.id}`}</Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EditNotificationDialog({ n }: { n: Notification }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedCats, setSelectedCats] = useState<number[]>([]);
  const qc = useQueryClient();

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["notification-detail", n.id],
    queryFn: () => getNotification(n.id),
    enabled: open,
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: listCategories,
    enabled: open,
  });

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && detail) {
      setTitle(detail.title);
      setContent(detail.content);
      setSelectedCats(detail.categories?.map((c) => c.id) ?? []);
    }
  };

  const [initialized, setInitialized] = useState(false);
  if (open && detail && !initialized) {
    setTitle(detail.title);
    setContent(detail.content);
    setSelectedCats(detail.categories?.map((c) => c.id) ?? []);
    setInitialized(true);
  }
  if (!open && initialized) setInitialized(false);

  const mut = useMutation({
    mutationFn: () => updateNotification(n.id, { title, content, categories: selectedCats }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notification-detail", n.id] });
      setOpen(false);
      toast.success("更新成功");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-6 w-6" title="编辑">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑通知</DialogTitle>
        </DialogHeader>
        {detailLoading ? (
          <p className="text-xs text-muted-foreground py-4">加载中...</p>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>标题</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>内容</Label>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6} />
            </div>
            <div className="space-y-1">
              <Label>分类</Label>
              <div className="flex gap-2 flex-wrap">
                {categories?.map((c) => (
                  <Badge
                    key={c.id}
                    variant={selectedCats.includes(c.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setSelectedCats((prev) => prev.includes(c.id) ? prev.filter((id) => id !== c.id) : [...prev, c.id])}
                  >
                    {c.name}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || detailLoading}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ApproveDialog({ notificationId }: { notificationId: number }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const qc = useQueryClient();

  const mut = useMutation({
    mutationFn: (status: 1 | 2) => approveNotification(notificationId, { status, note }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notification-detail", notificationId] });
      qc.invalidateQueries({ queryKey: ["notification-stats"] });
      setOpen(false);
      toast.success("审批完成");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-6 w-6" title="审批">
          <ShieldCheck className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>审批通知 #{notificationId}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label>备注</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="审批备注" />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="destructive" size="sm" onClick={() => mut.mutate(2)} disabled={mut.isPending}>
            <X className="h-3.5 w-3.5 mr-1" />拒绝
          </Button>
          <Button size="sm" onClick={() => mut.mutate(1)} disabled={mut.isPending}>
            <Check className="h-3.5 w-3.5 mr-1" />通过
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateNotificationDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedCats, setSelectedCats] = useState<number[]>([]);
  const qc = useQueryClient();

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: listCategories,
    enabled: open,
  });

  const mut = useMutation({
    mutationFn: () => createNotification({ title, content, categories: selectedCats }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notification-stats"] });
      setOpen(false);
      setTitle("");
      setContent("");
      setSelectedCats([]);
      toast.success("创建成功");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8">
          <Plus className="h-3.5 w-3.5 mr-1" />新建通知
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新建通知</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>标题</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>内容</Label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6} />
          </div>
          <div className="space-y-1">
            <Label>分类</Label>
            <div className="flex gap-2 flex-wrap">
              {categories?.map((c) => (
                <Badge
                  key={c.id}
                  variant={selectedCats.includes(c.id) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setSelectedCats((prev) => prev.includes(c.id) ? prev.filter((id) => id !== c.id) : [...prev, c.id])}
                >
                  {c.name}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>创建</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- Categories Tab ----
function CategoriesTab() {
  const qc = useQueryClient();
  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: listCategories,
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [sort, setSort] = useState("0");

  const createMut = useMutation({
    mutationFn: () => createCategory({ name, sort: parseInt(sort), is_active: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      setCreateOpen(false);
      setName("");
      toast.success("分类创建成功");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <div className="flex shrink-0 items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Tag className="h-4 w-4 text-blue-500" />通知分类
        </h3>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8">
              <Plus className="h-3.5 w-3.5 mr-1" />新建分类
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新建分类</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>名称</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>排序</Label>
                <Input value={sort} onChange={(e) => setSort(e.target.value)} type="number" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => createMut.mutate()} disabled={createMut.isPending}>创建</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <p className="text-xs text-muted-foreground py-4 text-center">加载中...</p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto border rounded-lg divide-y">
          {categories?.map((c) => (
            <CategoryRow key={c.id} category={c} />
          ))}
          {(!categories || categories.length === 0) && (
            <p className="text-xs text-muted-foreground py-4 text-center">暂无分类</p>
          )}
        </div>
      )}
    </div>
  );
}

function CategoryRow({ category }: { category: NotificationCategory }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [sort, setSort] = useState(String(category.sort));
  const [isActive, setIsActive] = useState(category.is_active);
  const qc = useQueryClient();

  const updateMut = useMutation({
    mutationFn: () => updateCategory(category.id, { name, sort: parseInt(sort), is_active: isActive }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["categories"] }); setEditing(false); toast.success("已更新"); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 hover:bg-muted/50 transition-colors group">
      <span className="text-xs text-muted-foreground w-10 shrink-0">#{category.id}</span>
      {editing ? (
        <Input value={name} onChange={(e) => setName(e.target.value)} className="h-7 text-sm flex-1" />
      ) : (
        <span className="text-sm font-medium truncate min-w-20">{category.name}</span>
      )}
      {editing ? (
        <Input value={sort} onChange={(e) => setSort(e.target.value)} type="number" className="h-7 text-sm w-12 shrink-0" />
      ) : (
        <span className="text-xs text-muted-foreground w-12 shrink-0 text-center">{category.sort}</span>
      )}
      {editing ? (
        <Switch checked={isActive} onCheckedChange={setIsActive} />
      ) : (
        <Badge variant={category.is_active ? "default" : "secondary"} className="text-[10px] px-1.5 py-0 h-4 w-14 justify-center shrink-0">
          {category.is_active ? "启用" : "禁用"}
        </Badge>
      )}
      <div className="w-20 shrink-0 flex items-center gap-0.5 justify-end">
        {editing ? (
          <>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateMut.mutate()} disabled={updateMut.isPending}>
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditing(false)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </>
        ) : (
          <div className="flex items-center gap-0.5">
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
