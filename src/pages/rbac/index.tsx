import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listRoles,
  createRole,
  listPermissions,
  createPermission,
  listAllRolesWithPermissions,
  updateRolePermissions,
  updateUserRoles,
} from "@/api/rbac";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Shield, Key, Users, Plus, Settings, Search } from "lucide-react";
import type { Permission, Role } from "@/types/api";

export default function RBACPage() {
  const [tab, setTab] = useState<"roles" | "permissions" | "user-roles">("roles");
  const [urUserId, setUrUserId] = useState("");
  const [urSearchId, setUrSearchId] = useState<number | null>(null);

  const handleUrSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const id = parseInt(urUserId, 10);
    if (isNaN(id) || id <= 0) { toast.error("请输入有效用户 ID"); return; }
    setUrSearchId(id);
  };

  return (
    <div className="flex min-h-0 w-full flex-col gap-4 overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-2 flex-wrap py-1">
        <div className="flex items-center border rounded-lg overflow-hidden h-8 text-sm">
          <button onClick={() => setTab("roles")} className={`px-3 h-full flex items-center gap-1 transition-colors ${tab === "roles" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}><Shield className="h-3.5 w-3.5" />角色</button>
          <button onClick={() => setTab("permissions")} className={`px-3 h-full flex items-center gap-1 transition-colors ${tab === "permissions" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}><Key className="h-3.5 w-3.5" />权限</button>
          <button onClick={() => setTab("user-roles")} className={`px-3 h-full flex items-center gap-1 transition-colors ${tab === "user-roles" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}><Users className="h-3.5 w-3.5" />用户角色</button>
        </div>
        {tab === "roles" && <RolesToolbar />}
        {tab === "permissions" && <PermissionsToolbar />}
        {tab === "user-roles" && (
          <form onSubmit={handleUrSearch} className="flex gap-2">
            <Input placeholder="用户 ID" value={urUserId} onChange={(e) => setUrUserId(e.target.value)} type="number" className="w-36 h-8 text-sm" />
            <Button type="submit" size="sm" variant="outline" className="h-8"><Search className="h-4 w-4" /></Button>
          </form>
        )}
      </div>

      {tab === "roles" && <RolesTab />}
      {tab === "permissions" && <PermissionsTab />}
      {tab === "user-roles" && <UserRolesTab searchId={urSearchId} />}
    </div>
  );
}

// ---- Roles Toolbar ----
function RolesToolbar() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [desc, setDesc] = useState("");

  const createMut = useMutation({
    mutationFn: () => createRole({ name, role_tag: tag, description: desc }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["roles"] }); setCreateOpen(false); setName(""); setTag(""); setDesc(""); toast.success("角色创建成功"); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 text-sm gap-1"><Plus className="h-3.5 w-3.5" />新建角色</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>新建角色</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>名称</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1"><Label>标签</Label><Input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="如 admin, editor" /></div>
          <div className="space-y-1"><Label>描述</Label><Input value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
        </div>
        <DialogFooter><Button onClick={() => createMut.mutate()} disabled={createMut.isPending}>创建</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- Roles Tab ----
function RolesTab() {
  const { data: roles, isLoading } = useQuery({ queryKey: ["roles"], queryFn: listRoles });

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {isLoading ? <div className="flex min-h-0 flex-1 items-center justify-center"><p className="text-xs text-muted-foreground">加载中...</p></div> : (
        <div className="min-h-0 flex-1 overflow-y-auto border rounded-lg divide-y">
          {roles?.map((r) => (
            <div key={r.role.id} className="flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-muted/50 transition-colors group">
              <Shield className="h-4 w-4 text-blue-500 shrink-0" />
              <span className="text-sm font-medium truncate flex-1 min-w-16">{r.role.name}</span>
              <span className="w-20 shrink-0">
                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 shrink-0">{r.role.role_tag}</Badge>
              </span>
              <span className="text-xs text-muted-foreground truncate w-16">{r.role.description || ""}</span>
              <RoleUsersDialog roleName={r.role.name} userIds={r.user_ids ?? []} userCount={r.user_count} />
              <div className="self-end shrink-0 w-6">
                <RolePermissionsDialog role={r.role} />
              </div>
            </div>
          ))}
          {(!roles || roles.length === 0) && <p className="text-xs text-muted-foreground py-4 text-center">暂无角色</p>}
        </div>
      )}
    </div>
  );
}

function RoleUsersDialog({ roleName, userIds, userCount }: { roleName: string; userIds: number[]; userCount: number }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-xs text-muted-foreground w-16 shrink-0 flex items-center gap-0.5 hover:text-foreground transition-colors">
          <Users className="h-3 w-3" />{userCount}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{roleName} — 用户列表 ({userCount})</DialogTitle></DialogHeader>
        {userIds.length > 0 ? (
          <div className="border rounded-lg divide-y max-h-60 overflow-auto">
            {userIds.map((id, i) => (
              <div key={id} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-muted/50 transition-colors">
                <span className={`text-xs font-bold w-5 text-center shrink-0 ${i < 3 ? "text-blue-500" : "text-muted-foreground"}`}>{i + 1}</span>
                <span className="text-xs font-mono">#{id}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground py-4 text-center">暂无用户</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RolePermissionsDialog({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: allPerms } = useQuery({ queryKey: ["permissions"], queryFn: listPermissions, enabled: open });
  const { data: rolesWithPerms } = useQuery({
    queryKey: ["roles-with-permissions"],
    queryFn: listAllRolesWithPermissions,
    enabled: open,
  });

  const rolePerms = rolesWithPerms?.roles?.find((r) => r.role.id === role.id)?.permissions;

  const [selected, setSelected] = useState<number[]>([]);

  const updateMut = useMutation({
    mutationFn: () => updateRolePermissions(role.id, selected),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["roles-with-permissions"] }); toast.success("权限已更新"); setOpen(false); },
    onError: (e) => toast.error(e.message),
  });

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && rolePerms) {
      setSelected(rolePerms.map((p) => p.id));
    }
  };

  if (open && rolePerms && selected.length === 0 && rolePerms.length > 0) {
    setSelected(rolePerms.map((p) => p.id));
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-6 w-6"><Settings className="h-3.5 w-3.5" /></Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[80vh] flex-col overflow-hidden">
        <DialogHeader><DialogTitle>角色权限 — {role.name}</DialogTitle></DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto border rounded-lg divide-y">
          {allPerms?.map((p) => (
            <div key={p.id} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-muted/50 transition-colors">
              <Key className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span className="text-sm flex-1 min-w-0 truncate">{p.name}</span>
              <span className="text-[10px] text-muted-foreground shrink-0 font-mono">{p.permission_tag}</span>
              <Switch
                checked={selected.includes(p.id)}
                onCheckedChange={(checked) => {
                  setSelected((prev) => checked ? [...prev, p.id] : prev.filter((id) => id !== p.id));
                }}
              />
            </div>
          ))}
        </div>
        <DialogFooter><Button onClick={() => updateMut.mutate()} disabled={updateMut.isPending}>保存</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- Permissions Toolbar ----
function PermissionsToolbar() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [desc, setDesc] = useState("");

  const createMut = useMutation({
    mutationFn: () => createPermission({ name, permission_tag: tag, description: desc }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["permissions"] }); setCreateOpen(false); setName(""); setTag(""); setDesc(""); toast.success("权限创建成功"); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 text-sm gap-1"><Plus className="h-3.5 w-3.5" />新建权限</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>新建权限</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>名称</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1"><Label>标签</Label><Input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="如 user.read" /></div>
          <div className="space-y-1"><Label>描述</Label><Input value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
        </div>
        <DialogFooter><Button onClick={() => createMut.mutate()} disabled={createMut.isPending}>创建</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- Permissions Tab ----
function PermissionsTab() {
  const { data: permissions, isLoading } = useQuery({ queryKey: ["permissions"], queryFn: listPermissions });

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {isLoading ? <div className="flex min-h-0 flex-1 items-center justify-center"><p className="text-xs text-muted-foreground">加载中...</p></div> : (
        <div className="min-h-0 flex-1 overflow-y-auto border rounded-lg divide-y">
          {permissions?.map((p: Permission) => (
            <div key={p.id} className="flex items-center gap-3 px-3 py-1.5 hover:bg-muted/50 transition-colors">
              <Key className="h-4 w-4 text-amber-500 shrink-0" />
              <span className="text-sm font-medium truncate w-28 shrink-0">{p.name}</span>
              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 shrink-0 font-mono">{p.permission_tag}</Badge>
              <span className="text-xs text-muted-foreground flex-1 min-w-0">{p.description || ""}</span>
            </div>
          ))}
          {(!permissions || permissions.length === 0) && <p className="text-xs text-muted-foreground py-4 text-center">暂无权限</p>}
        </div>
      )}
    </div>
  );
}

// ---- User Roles Toolbar ----
// ---- User Roles Tab ----
function UserRolesTab({ searchId }: { searchId: number | null }) {
  const qc = useQueryClient();

  const { data: allRoles } = useQuery({ queryKey: ["roles"], queryFn: listRoles });

  const userRoleIds = searchId
    ? allRoles?.filter((r) => r.user_ids?.includes(searchId)).map((r) => r.role.id) ?? []
    : [];

  const [selected, setSelected] = useState<number[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [lastSearchId, setLastSearchId] = useState<number | null>(null);

  if (searchId !== lastSearchId) {
    setLastSearchId(searchId);
    setLoaded(false);
    setSelected([]);
  }

  if (searchId && allRoles && !loaded && userRoleIds.length >= 0) {
    setSelected(userRoleIds);
    setLoaded(true);
  }

  const updateMut = useMutation({
    mutationFn: () => updateUserRoles(searchId!, selected),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["roles"] }); toast.success("用户角色已更新"); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">

      {!searchId && <p className="text-xs text-muted-foreground py-4 text-center">输入用户 ID 查询角色</p>}

      {searchId && loaded && (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
          <p className="text-sm text-muted-foreground">用户 <span className="font-medium text-foreground">#{searchId}</span> 的角色</p>
          <div className="min-h-0 flex-1 overflow-y-auto border rounded-lg divide-y">
            {allRoles?.map((r) => (
              <div key={r.role.id} className="flex items-center gap-3 px-3 py-1.5 hover:bg-muted/50 transition-colors">
                <Shield className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                <span className="text-sm truncate w-28 shrink-0">{r.role.name}</span>
                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 shrink-0">{r.role.role_tag}</Badge>
                <span className="flex-1" />
                <Switch
                  checked={selected.includes(r.role.id)}
                  onCheckedChange={(checked) =>
                    setSelected((prev) => checked ? [...prev, r.role.id] : prev.filter((id) => id !== r.role.id))
                  }
                />
              </div>
            ))}
          </div>
          <div className="flex shrink-0 justify-end">
            <Button size="sm" className="h-8 text-sm" onClick={() => updateMut.mutate()} disabled={updateMut.isPending}>保存角色</Button>
          </div>
        </div>
      )}
    </div>
  );
}
