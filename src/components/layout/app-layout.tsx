import { Navigate, Outlet, useLocation, Link } from "react-router";
import { useAuthStore } from "@/hooks/use-auth";
import { logout } from "@/api/auth";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  Shield,
  Bell,
  ToggleLeft,
  FileText,
  Star,
  BookOpen,
  Trophy,
  Settings,
  Coins,
  LogOut,
  Calendar,
  Activity,
} from "lucide-react";

type NavItem = {
  title: string;
  href: string;
  icon: typeof LayoutDashboard;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: "总览",
    items: [
      { title: "仪表盘", href: "/", icon: LayoutDashboard },
    ],
  },
  {
    label: "用户与权限",
    items: [
      { title: "用户管理", href: "/users", icon: Users },
      { title: "权限管理", href: "/rbac", icon: Shield },
      { title: "积分管理", href: "/points", icon: Coins },
    ],
  },
  {
    label: "内容管理",
    items: [
      { title: "通知管理", href: "/notifications", icon: Bell },
      { title: "内测管理", href: "/features", icon: ToggleLeft },
      { title: "投稿管理", href: "/contributions", icon: FileText },
      { title: "教师评价", href: "/reviews", icon: Star },
      { title: "资料管理", href: "/materials", icon: BookOpen },
      { title: "英雄榜", href: "/heroes", icon: Trophy },
      { title: "刷题管理", href: "/questions", icon: FileText },
    ],
  },
  {
    label: "教务数据",
    items: [
      { title: "课表管理", href: "/course-tables", icon: Calendar },
      { title: "挂科率管理", href: "/failrates", icon: Activity },
    ],
  },
  {
    label: "系统设置",
    items: [
      { title: "系统配置", href: "/config", icon: Settings },
    ],
  },
];

const navItems = navGroups.flatMap((group) => group.items);

export default function AppLayout() {
  const { token, user, clearAuth } = useAuthStore();
  const location = useLocation();
  const currentTitle =
    navItems.find(
      (i) =>
        i.href === "/"
          ? location.pathname === "/"
          : location.pathname.startsWith(i.href)
    )?.title ?? "";

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      clearAuth();
    }
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
              G
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">GoJxust</span>
              <span className="text-xs text-muted-foreground">后台管理</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          {navGroups.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={
                          item.href === "/"
                            ? location.pathname === "/"
                            : location.pathname.startsWith(item.href)
                        }
                      >
                        <Link to={item.href}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter>
          <div className="flex items-center justify-between px-2 py-2">
            <div className="flex flex-col text-sm">
              <span className="font-medium">{user?.nickname || user?.real_name || "管理员"}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="退出登录">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-h-0 overflow-hidden">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur supports-backdrop-filter:bg-background/80 sm:h-14 sm:px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4!" />
          <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
            <h1 className="truncate text-sm font-medium sm:text-base">{currentTitle}</h1>
          </div>
        </header>
        <main
          className={`flex min-h-0 min-w-0 flex-1 overflow-hidden p-3 sm:p-4`}
        >
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
