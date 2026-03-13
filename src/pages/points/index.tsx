import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { grantPoints, getPointsStats, listTransactions } from "@/api/points";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Coins, Plus, Search, ArrowUpCircle, ArrowDownCircle, Clock, Trophy, X } from "lucide-react";

type PointsSourceStats = Record<string, Record<string, number>>;

const TX_TYPE_MAP: Record<number, string> = { 1: "获得", 2: "消耗" };

export default function PointsPage() {
  const [userId, setUserId] = useState("");
  const [searchId, setSearchId] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  const clearSearch = () => {
    setSearchId(null);
    setUserId("");
    setPage(1);
  };

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["points-stats", searchId],
    queryFn: () => getPointsStats(searchId!),
    enabled: searchId !== null,
  });

  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ["transactions", page, searchId],
    queryFn: () => listTransactions({ page, size: 20, user_id: searchId! }),
    enabled: searchId !== null,
  });

  const total = txData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const id = parseInt(userId);
    if (isNaN(id) || id <= 0) { toast.error("请输入有效用户 ID"); return; }
    setSearchId(id);
    setPage(1);
  };

  return (
    <div className="flex min-h-0 w-full flex-col gap-4 overflow-hidden">
      {/* 查询栏 */}
      <form onSubmit={handleSearch} className="flex shrink-0 items-center gap-2 flex-wrap m-0.5">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="输入用户 ID 查询..."
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            type="number"
            className="h-8 w-45 pl-7 pr-8 text-sm"
          />
          {(userId || searchId !== null) && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground"
              onClick={clearSearch}
              aria-label="清除搜索"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <Button type="submit" size="sm" className="h-8 text-sm" disabled={statsLoading}>查询</Button>
        <div className="ml-auto"><GrantPointsDialog /></div>
      </form>

      {/* 查询结果：左侧积分概览 + 右侧流水 */}
      {searchId !== null && (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[280px_minmax(0,1fr)]">
          {/* 左侧：积分概览 */}
          <div className="min-h-0 space-y-3 overflow-y-auto lg:pr-1">
            {statsLoading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">加载中...</p>
            ) : stats ? (
              <>
                <p className="text-sm text-muted-foreground">用户 #{searchId} 积分概览</p>
                <div className="border rounded-lg divide-y">
                  <div className="flex items-center justify-between px-2.5 py-1.5">
                    <span className="text-sm text-muted-foreground flex items-center gap-1"><Coins className="h-3.5 w-3.5 text-amber-500" />当前积分</span>
                    <span className="text-sm font-bold">{stats.points}</span>
                  </div>
                  <div className="flex items-center justify-between px-2.5 py-1.5">
                    <span className="text-sm text-muted-foreground flex items-center gap-1"><Trophy className="h-3.5 w-3.5 text-amber-500" />排名</span>
                    <span className="text-sm font-mono">#{stats.rank}</span>
                  </div>
                </div>

                {/* 来源统计 */}
                {stats.source_stats && Object.keys(stats.source_stats).length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">来源统计</p>
                    <div className="border rounded-lg divide-y">
                      {Object.entries(stats.source_stats as PointsSourceStats).flatMap(([source, sourceStats]) =>
                        Object.entries(sourceStats).map(([type, value]) => (
                          <div key={`${source}-${type}`} className="flex items-center justify-between px-2.5 py-1.5">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">{source}</Badge>
                              <span className="text-sm text-muted-foreground">{type}</span>
                            </div>
                            <Badge variant={value >= 0 ? "default" : "destructive"} className="text-xs px-1.5 py-0 h-5 font-mono">
                              {value >= 0 ? `+${value}` : value}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>

          {/* 右侧：积分流水 */}
          <div className="flex min-h-0 flex-col gap-2 overflow-hidden">
            <p className="text-sm text-muted-foreground">积分流水</p>
            {txLoading ? (
              <div className="flex min-h-0 flex-1 items-center justify-center">
                <p className="text-sm text-muted-foreground py-4 text-center">加载中...</p>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
                <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border">
                  <div className="overflow-x-auto">
                    <table className="min-w-max w-full text-sm">
                      <tbody className="divide-y">
                  {txData?.data?.map((t) => {
                    const isGain = t.points >= 0;
                    return (
                      <tr key={t.id} className="hover:bg-muted/50 transition-colors group">
                        <td className="px-3 py-2 w-0">
                          {isGain
                            ? <ArrowUpCircle className="h-4 w-4 text-emerald-500" />
                            : <ArrowDownCircle className="h-4 w-4 text-red-500" />
                          }
                        </td>
                        <td className="py-2 pr-3 whitespace-nowrap">
                          <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">{t.source}</Badge>
                        </td>
                        <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">{TX_TYPE_MAP[t.type] ?? t.type}</td>
                        <td className="py-2 pr-3 text-muted-foreground whitespace-normal max-w-25">{t.description}</td>
                        <td className="py-2 pr-3 whitespace-nowrap">
                          <Badge variant={isGain ? "default" : "destructive"} className="text-sm px-1.5 py-0 h-5 font-mono">
                            {isGain ? `+${t.points}` : t.points}
                          </Badge>
                        </td>
                        <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">
                          <span className="flex items-center gap-0.5">
                            <Clock className="h-3.5 w-3.5" />{new Date(t.created_at).toLocaleDateString()}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                      </tbody>
                    </table>
                  </div>
                  {(!txData?.data || txData.data.length === 0) && (
                    <p className="text-sm text-muted-foreground py-6 text-center">暂无流水记录</p>
                  )}
                </div>

                {total > 0 && (
                  <div className="flex shrink-0 items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground">共 {total} 条 · 第 {page}/{totalPages} 页</p>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="outline" className="h-8 text-sm px-2" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
                      <Button size="sm" variant="outline" className="h-8 text-sm px-2" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>下一页</Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function GrantPointsDialog() {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [points, setPoints] = useState("");
  const [description, setDescription] = useState("");
  const qc = useQueryClient();

  const mut = useMutation({
    mutationFn: () => grantPoints({ user_id: parseInt(userId), points: parseInt(points), description }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      setOpen(false); setUserId(""); setPoints(""); setDescription("");
      toast.success("积分发放成功");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 text-sm gap-1"><Plus className="h-3.5 w-3.5" />发放积分</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>发放积分</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label className="text-sm">用户 ID</Label><Input value={userId} onChange={(e) => setUserId(e.target.value)} type="number" className="h-8 text-sm" /></div>
          <div className="space-y-1"><Label className="text-sm">积分 (正数增加, 负数扣除)</Label><Input value={points} onChange={(e) => setPoints(e.target.value)} type="number" className="h-8 text-sm" /></div>
          <div className="space-y-1"><Label className="text-sm">描述</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="积分变动原因" className="h-8 text-sm" /></div>
        </div>
        <DialogFooter>
          <Button size="sm" onClick={() => mut.mutate()} disabled={mut.isPending || !userId || !points || !description}>发放</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
