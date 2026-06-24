import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { getNotificationStats } from "@/api/notifications";
import { getContributionStatsAdmin } from "@/api/contributions";
import {
  getSystemOnline,
  getAllProjectsOnlineStats,
  getPomodoroRanking,
  getQuestionProjects,
  getCountdownStatsByUser,
  getGPABackupStatsByUser,
  getStudyTaskStatsByUser,
} from "@/api/stats";
import { getTopMaterials, getHotWords } from "@/api/materials";
import { Bell, FileText, Users, Activity, Timer, TrendingUp, Hash, Flame, Calendar, BookOpen, GraduationCap } from "lucide-react";
import type { MaterialListItem } from "@/types/api";

function getHotnessValue(material: MaterialListItem, type: 0 | 7) {
  return type === 7 ? material.period_hotness : material.total_hotness;
}

export default function DashboardPage() {
  const notifStats = useQuery({ queryKey: ["notification-stats"], queryFn: getNotificationStats });
  const contribStats = useQuery({ queryKey: ["contribution-stats"], queryFn: getContributionStatsAdmin });
  const systemOnline = useQuery({ queryKey: ["system-online"], queryFn: getSystemOnline });
  const projectOnlineStats = useQuery({
    queryKey: ["projects-online-stats"],
    queryFn: getAllProjectsOnlineStats,
    select: (data) => [...data.projects].sort((a, b) => b.online_count - a.online_count || a.project_id - b.project_id),
  });
  const pomodoroRanking = useQuery({ queryKey: ["pomodoro-ranking"], queryFn: getPomodoroRanking });
  const questionProjects = useQuery({ queryKey: ["question-projects"], queryFn: getQuestionProjects });
  const hotMaterialsAll = useQuery({ queryKey: ["materials-hot", 0], queryFn: () => getTopMaterials({ limit: 15, type: 0 }) });
  const hotMaterialsWeek = useQuery({ queryKey: ["materials-hot", 7], queryFn: () => getTopMaterials({ limit: 15, type: 7 }) });
  const hotWords = useQuery({ queryKey: ["materials-hotwords-dash"], queryFn: () => getHotWords(15) });
  const countdownStats = useQuery({
    queryKey: ["countdown-stats-by-user"],
    queryFn: () => getCountdownStatsByUser({ page: 1, page_size: 10 }),
  });
  const studyTaskStats = useQuery({
    queryKey: ["studytask-stats-by-user"],
    queryFn: () => getStudyTaskStatsByUser({ page: 1, page_size: 10 }),
  });
  const gpaBackupStats = useQuery({
    queryKey: ["gpa-backup-stats-by-user"],
    queryFn: () => getGPABackupStatsByUser({ page: 1, page_size: 10 }),
  });
  const totalOnlineCount = systemOnline.data?.online_count;
  const questionProjectMetaById = new Map(
    (questionProjects.data ?? []).map((project) => [
      project.id,
      {
        usageCount: project.usage_count,
        userCount: project.user_count,
      },
    ])
  );

  const stats = [
    { label: "当前在线", value: totalOnlineCount, icon: Activity, color: "text-emerald-500", loading: systemOnline.isLoading },
    { label: "通知总数", value: notifStats.data?.total_count, sub: `待审核 ${notifStats.data?.pending_count ?? 0}`, icon: Bell, color: "text-blue-500", loading: notifStats.isLoading },
    { label: "已发布通知", value: notifStats.data?.published_count, sub: `草稿 ${notifStats.data?.draft_count ?? 0}`, icon: Bell, color: "text-blue-500", loading: notifStats.isLoading },
    { label: "投稿总数", value: contribStats.data?.total_count, sub: `待审核 ${contribStats.data?.pending_count ?? 0}`, icon: FileText, color: "text-amber-500", loading: contribStats.isLoading },
    { label: "投稿已通过", value: contribStats.data?.approved_count, sub: `已拒绝 ${contribStats.data?.rejected_count ?? 0}`, icon: Users, color: "text-teal-500", loading: contribStats.isLoading },
    { label: "投稿积分总额", value: contribStats.data?.total_points, icon: Activity, color: "text-violet-500", loading: contribStats.isLoading },
  ];

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-6 overflow-y-auto [&::-webkit-scrollbar]:hidden">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="border rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className={`h-3.5 w-3.5 shrink-0 ${s.color}`} />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <div className="text-xl font-bold">{s.loading ? "..." : (s.value ?? "-")}</div>
              {s.sub && <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>}
            </div>
          );
        })}
      </div>

      {/* Ranked Lists */}
      <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
        <div className="break-inside-avoid">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Users className="h-4 w-4 text-emerald-500" />题库项目在线</h3>
          {projectOnlineStats.isLoading ? <p className="text-xs text-muted-foreground">加载中...</p> : (
            <div className="border rounded-lg divide-y">
              {projectOnlineStats.data?.map((project, index) => (
                <div key={`${project.project_id}-${project.online_count}-${index}`} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-muted/50 transition-colors">
                  <span className="text-sm truncate flex-1 min-w-0">{project.project_name}</span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                    {typeof questionProjectMetaById.get(project.project_id)?.usageCount === "number" && (
                      <span>{questionProjectMetaById.get(project.project_id)?.usageCount} 次</span>
                    )}
                    {typeof questionProjectMetaById.get(project.project_id)?.userCount === "number" && (
                      <span>{questionProjectMetaById.get(project.project_id)?.userCount} 人</span>
                    )}
                  </div>
                  <span className="text-xs text-emerald-500 font-medium shrink-0">{project.online_count} 在线</span>
                </div>
              ))}
              {(!projectOnlineStats.data || projectOnlineStats.data.length === 0) && <p className="text-xs text-muted-foreground py-4 text-center">暂无数据</p>}
            </div>
          )}
        </div>
        <div className="break-inside-avoid">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Timer className="h-4 w-4 text-rose-500" />番茄钟排行</h3>
          {pomodoroRanking.isLoading ? <p className="text-xs text-muted-foreground">加载中...</p> : (
            <div className="border rounded-lg divide-y">
              {pomodoroRanking.data?.map((u, i) => (
                <div key={`${u.rank}-${u.nickname}-${i}`} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-muted/50 transition-colors">
                  <span className={`text-xs font-bold w-5 text-center shrink-0 ${i < 3 ? "text-rose-500" : "text-muted-foreground"}`}>{i + 1}</span>
                  <span className="text-sm truncate flex-1 min-w-0">{u.nickname}</span>
                  <span className="text-xs text-rose-500 font-medium shrink-0">{u.pomodoro_count} 次</span>
                </div>
              ))}
              {(!pomodoroRanking.data || pomodoroRanking.data.length === 0) && <p className="text-xs text-muted-foreground py-4 text-center">暂无数据</p>}
            </div>
          )}
        </div>
        <HotMaterialsCard title="热门资料 · 全部" colorClass="text-orange-500" type={0} query={hotMaterialsAll} />
        <HotMaterialsCard title="热门资料 · 周榜" colorClass="text-amber-500" type={7} query={hotMaterialsWeek} />
        <div className="break-inside-avoid">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Hash className="h-4 w-4 text-violet-500" />热搜词</h3>
          {hotWords.isLoading ? <p className="text-xs text-muted-foreground">加载中...</p> : (
            <div className="border rounded-lg divide-y">
              {hotWords.data?.map((w, i) => (
                <div key={`${w.keywords}-${w.count}-${i}`} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-muted/50 transition-colors">
                  <span className={`text-xs font-bold w-5 text-center shrink-0 ${i < 3 ? "text-violet-500" : "text-muted-foreground"}`}>{i + 1}</span>
                  <span className="text-sm truncate flex-1 min-w-0">{w.keywords}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{w.count} 次</span>
                </div>
              ))}
              {(!hotWords.data || hotWords.data.length === 0) && <p className="text-xs text-muted-foreground py-4 text-center">暂无数据</p>}
            </div>
          )}
        </div>
        <div className="break-inside-avoid">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Calendar className="h-4 w-4 text-sky-500" />倒数日用户分布</h3>
          {countdownStats.isLoading ? <p className="text-xs text-muted-foreground">加载中...</p> : (
            <div className="border rounded-lg divide-y">
              {countdownStats.data?.data?.map((item, index) => (
                <div key={`${item.user_id}-${item.count}-${index}`} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-muted/50 transition-colors">
                  <span className={`text-xs font-bold w-5 text-center shrink-0 ${index < 3 ? "text-sky-500" : "text-muted-foreground"}`}>{index + 1}</span>
                  <span className="text-sm truncate flex-1 min-w-0">用户 #{item.user_id}</span>
                  <span className="text-xs text-sky-500 font-medium shrink-0">{item.count} 个</span>
                </div>
              ))}
              {(!countdownStats.data?.data || countdownStats.data.data.length === 0) && <p className="text-xs text-muted-foreground py-4 text-center">暂无数据</p>}
            </div>
          )}
        </div>
        <div className="break-inside-avoid">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><BookOpen className="h-4 w-4 text-teal-500" />学习清单用户分布</h3>
          {studyTaskStats.isLoading ? <p className="text-xs text-muted-foreground">加载中...</p> : (
            <div className="border rounded-lg divide-y">
              {studyTaskStats.data?.data?.map((item, index) => (
                <div key={`${item.user_id}-${item.count}-${index}`} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-muted/50 transition-colors">
                  <span className={`text-xs font-bold w-5 text-center shrink-0 ${index < 3 ? "text-teal-500" : "text-muted-foreground"}`}>{index + 1}</span>
                  <span className="text-sm truncate flex-1 min-w-0">用户 #{item.user_id}</span>
                  <span className="text-xs text-teal-500 font-medium shrink-0">{item.count} 项</span>
                </div>
              ))}
              {(!studyTaskStats.data?.data || studyTaskStats.data.data.length === 0) && <p className="text-xs text-muted-foreground py-4 text-center">暂无数据</p>}
            </div>
          )}
        </div>
        <div className="break-inside-avoid">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><GraduationCap className="h-4 w-4 text-indigo-500" />GPA 备份用户分布</h3>
          {gpaBackupStats.isLoading ? <p className="text-xs text-muted-foreground">加载中...</p> : (
            <div className="border rounded-lg divide-y">
              {gpaBackupStats.data?.data?.map((item, index) => (
                <div key={`${item.user_id}-${item.count}-${index}`} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-muted/50 transition-colors">
                  <span className={`text-xs font-bold w-5 text-center shrink-0 ${index < 3 ? "text-indigo-500" : "text-muted-foreground"}`}>{index + 1}</span>
                  <span className="text-sm truncate flex-1 min-w-0">用户 #{item.user_id}</span>
                  <span className="text-xs text-indigo-500 font-medium shrink-0">{item.count} 份</span>
                </div>
              ))}
              {(!gpaBackupStats.data?.data || gpaBackupStats.data.data.length === 0) && <p className="text-xs text-muted-foreground py-4 text-center">暂无数据</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HotMaterialsCard({
  title,
  colorClass,
  type,
  query,
}: {
  title: string;
  colorClass: string;
  type: 0 | 7;
  query: UseQueryResult<MaterialListItem[]>;
}) {
  return (
    <div className="break-inside-avoid">
      <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
        <TrendingUp className={`h-4 w-4 ${colorClass}`} />
        {title}
      </h3>
      {query.isLoading ? (
        <p className="text-xs text-muted-foreground">加载中...</p>
      ) : (
        <div className="border rounded-lg divide-y">
          {query.data?.map((material, index) => (
            <div key={`${material.md5}-${index}`} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-muted/50 transition-colors">
              <span className={`text-xs font-bold w-5 text-center shrink-0 ${index < 3 ? colorClass : "text-muted-foreground"}`}>
                {index + 1}
              </span>
              <span className="text-sm truncate flex-1 min-w-0">{material.file_name}</span>
              <span className={`text-xs font-medium shrink-0 flex items-center gap-0.5 ${colorClass}`}>
                <Flame className="h-3 w-3" />
                {getHotnessValue(material, type)}
              </span>
            </div>
          ))}
          {(!query.data || query.data.length === 0) && <p className="text-xs text-muted-foreground py-4 text-center">暂无数据</p>}
        </div>
      )}
    </div>
  );
}
