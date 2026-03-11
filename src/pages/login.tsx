import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useAuthStore } from "@/hooks/use-auth";
import { login } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!phone || !password) {
      toast.error("请输入手机号和密码");
      return;
    }
    setLoading(true);
    try {
      const res = await login({ phone, password });
      setAuth(res.token, res.refresh_token, res.user_info);
      toast.success("登录成功");
      navigate("/", { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "登录失败";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 px-4 py-6 sm:px-6">
      <Card className="w-full max-w-sm border-0 bg-transparent shadow-none sm:rounded-2xl sm:border sm:bg-background sm:shadow-sm">
        <CardHeader className="space-y-0 px-5 pt-6 pb-4 sm:px-6">
          <CardTitle className="text-center text-xl sm:text-2xl">jxust-yqlx-admin</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-6 sm:px-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">手机号</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="请输入手机号"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="h-11"
              />
            </div>
            <Button type="submit" className="h-11 w-full" disabled={loading}>
              {loading ? "登录中..." : "登录"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
