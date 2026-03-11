import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getUser,
  banUser,
  unbanUser,
  kickUser,
  setLoginCredentials,
  resetUserCourseTableBindCount,
} from "@/api/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
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
import { toast } from "sonner";
import {
  Search,
  User,
  GraduationCap,
  Building2,
  BookOpen,
  Hash,
  Calendar,
  ShieldBan,
  MonitorSmartphone,
  LogOut,
  KeyRound,
  Ban,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import type { UserAuthDetail } from "@/types/api";

export default function UsersPage() {
  const [userId, setUserId] = useState("");
  const [searchId, setSearchId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useQuery({
    queryKey: ["admin-user", searchId],
    queryFn: () => getUser(searchId!),
    enabled: searchId !== null,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const id = parseInt(userId, 10);
    if (isNaN(id) || id <= 0) {
      toast.error("请输入有效的用户 ID");
      return;
    }
    setSearchId(id);
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden">
      <div className="flex items-center justify-end mt-1">
        <form onSubmit={handleSearch} className="m-0.5 flex items-center gap-3 py-1">
          <Input placeholder="输入用户 ID" value={userId} onChange={(e) => setUserId(e.target.value)} type="number" className="w-40 h-8 text-sm" />
          <Button type="submit" size="sm" variant="outline" className="h-8" disabled={isLoading}>
            <Search className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {error && <p className="text-sm text-destructive">查询失败: {error instanceof Error ? error.message : "未知错误"}</p>}

      {!user && !isLoading && !error && (
        <p className="text-sm text-muted-foreground py-8 text-center">输入用户 ID 查询</p>
      )}

      {isLoading && <p className="text-sm text-muted-foreground">加载中...</p>}

      {user && <UserDetail user={user} queryClient={queryClient} />}
    </div>
  );
}

function UserDetail({ user, queryClient }: { user: UserAuthDetail; queryClient: ReturnType<typeof useQueryClient> }) {
  const info = user.user_info;
  const isBlocked = !!user.block_type;

  const banMut = useMutation({
    mutationFn: (data: { reason?: string; duration_seconds?: number }) => banUser(info.id, data),
    onSuccess: () => { toast.success("封禁成功"); queryClient.invalidateQueries({ queryKey: ["admin-user", info.id] }); },
    onError: (e) => toast.error(e.message),
  });

  const unbanMut = useMutation({
    mutationFn: () => unbanUser(info.id),
    onSuccess: () => { toast.success("解封成功"); queryClient.invalidateQueries({ queryKey: ["admin-user", info.id] }); },
    onError: (e) => toast.error(e.message),
  });

  const kickMut = useMutation({
    mutationFn: () => kickUser(info.id),
    onSuccess: () => { toast.success("已踢下线"); queryClient.invalidateQueries({ queryKey: ["admin-user", info.id] }); },
    onError: (e) => toast.error(e.message),
  });

  const resetCourseTableBindCountMut = useMutation({
    mutationFn: () => resetUserCourseTableBindCount(info.id),
    onSuccess: () => {
      toast.success("课表绑定次数已重置");
      queryClient.invalidateQueries({ queryKey: ["admin-user", info.id] });
    },
    onError: (e) => toast.error(e.message),
  });

  const fields = [
    { label: "昵称", value: info.nickname, icon: User, color: "text-blue-500" },
    { label: "真实姓名", value: info.real_name, icon: User, color: "text-teal-500" },
    { label: "手机号", value: info.phone || "-", icon: Hash, color: "text-emerald-500" },
    { label: "学号", value: info.student_id, icon: Hash, color: "text-violet-500" },
    { label: "学院", value: info.college, icon: Building2, color: "text-amber-500" },
    { label: "专业", value: info.major, icon: BookOpen, color: "text-orange-500" },
    { label: "班级", value: info.class_id, icon: GraduationCap, color: "text-rose-500" },
    { label: "注册时间", value: info.created_at ? new Date(info.created_at).toLocaleString() : "-", icon: Calendar, color: "text-muted-foreground" },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      {/* User Info Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-semibold">#{info.id}</span>
        {isBlocked && <Badge variant="destructive">已封禁</Badge>}
        {info.role_tags?.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
      </div>

      <div className="flex min-h-0 flex-col gap-4 overflow-hidden md:flex-row md:items-start">
        {/* User Profile */}
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden md:max-h-full md:flex-1">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><User className="h-4 w-4 text-blue-500" />基本信息</h3>
          <div className="min-h-0 overflow-x-hidden overflow-y-auto border rounded-lg divide-y md:max-h-full">
            {fields.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.label} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-muted/50 transition-colors">
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${f.color}`} />
                  <span className="text-xs text-muted-foreground w-16 shrink-0">{f.label}</span>
                  <span className="text-sm truncate flex-1 min-w-0">{f.value || "-"}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column: Block info + Sessions */}
        <div className="flex min-h-0 min-w-0 flex-col gap-4 overflow-hidden md:max-h-full md:flex-1">
          {/* Block Info */}
          {isBlocked && (
            <div className="shrink-0">
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><ShieldBan className="h-4 w-4 text-destructive" />封禁信息</h3>
              <div className="border rounded-lg divide-y border-destructive/30">
                <div className="flex items-center gap-2 px-2.5 py-1.5">
                  <span className="text-xs text-muted-foreground w-16 shrink-0">类型</span>
                  <span className="text-sm">{user.block_type}</span>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-1.5">
                  <span className="text-xs text-muted-foreground w-16 shrink-0">原因</span>
                  <span className="text-sm">{user.block_reason || "-"}</span>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-1.5">
                  <span className="text-xs text-muted-foreground w-16 shrink-0">过期</span>
                  <span className="text-sm">{user.block_expires_at ? new Date(user.block_expires_at * 1000).toLocaleString() : "永久"}</span>
                </div>
              </div>
            </div>
          )}

          {/* Sessions */}
          <div className="flex min-h-0 min-w-0 flex-col overflow-hidden md:max-h-full">
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><MonitorSmartphone className="h-4 w-4 text-emerald-500" />在线会话 ({user.session_count})</h3>
            {user.devices?.length ? (
              <div className="min-h-0 overflow-x-hidden overflow-y-auto border rounded-lg divide-y md:max-h-full">
                {user.devices.map((d) => (
                  <div key={d.sid} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-muted/50 transition-colors text-sm">
                    <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 shrink-0">{d.client_type}</Badge>
                    <span className="truncate flex-1 min-w-0">{d.device_type}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{new Date(d.issued_at * 1000).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border rounded-lg">
                <p className="text-xs text-muted-foreground py-4 text-center">无在线会话</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {isBlocked ? (
          <Button size="sm" variant="outline" onClick={() => unbanMut.mutate()} disabled={unbanMut.isPending} className="h-8 text-sm gap-1">
            <ShieldCheck className="h-3.5 w-3.5" />解除封禁
          </Button>
        ) : (
          <BanDialog onConfirm={(reason, duration) => banMut.mutate({ reason, duration_seconds: duration })} loading={banMut.isPending} />
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="outline" disabled={kickMut.isPending} className="h-8 text-sm gap-1">
              <LogOut className="h-3.5 w-3.5" />踢下线
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认踢下线</AlertDialogTitle>
              <AlertDialogDescription>
                这会使该用户当前在线会话失效，需要重新登录后才能继续使用。确认继续吗？
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={() => kickMut.mutate()} disabled={kickMut.isPending}>
                确认踢下线
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-8 text-sm gap-1">
              <RotateCcw className="h-3.5 w-3.5" />重置课表绑定次数
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>重置课表绑定次数</AlertDialogTitle>
              <AlertDialogDescription>
                当前管理员接口不提供该用户的 bindcount 查询，仅执行重置操作。确认继续吗？
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => resetCourseTableBindCountMut.mutate()}
                disabled={resetCourseTableBindCountMut.isPending}
              >
                确认重置
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <CredentialsDialog userId={info.id} />
      </div>
    </div>
  );
}

function BanDialog({ onConfirm, loading }: { onConfirm: (reason: string, duration: number) => void; loading: boolean }) {
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState("86400");
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="destructive" className="h-8 text-sm gap-1"><Ban className="h-3.5 w-3.5" />封禁用户</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>封禁用户</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>封禁原因</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="请输入原因" />
          </div>
          <div className="space-y-1">
            <Label>封禁时长 (秒, 0=永久)</Label>
            <Input value={duration} onChange={(e) => setDuration(e.target.value)} type="number" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="destructive" onClick={() => { onConfirm(reason, parseInt(duration)); setOpen(false); }} disabled={loading}>
            确认封禁
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CredentialsDialog({ userId }: { userId: number }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [open, setOpen] = useState(false);

  const mut = useMutation({
    mutationFn: () => setLoginCredentials(userId, { phone, password }),
    onSuccess: () => { toast.success("凭证设置成功"); setOpen(false); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 text-sm gap-1"><KeyRound className="h-3.5 w-3.5" />设置凭证</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>设置登录凭证</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>手机号</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>密码</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>确认设置</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
