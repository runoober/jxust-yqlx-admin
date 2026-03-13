import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createQuestion,
  createQuestionProject,
  deleteQuestion,
  deleteQuestionProject,
  getQuestion,
  listAdminQuestionProjects,
  listQuestions,
  updateQuestion,
  updateQuestionProject,
  type QuestionPayload,
  type QuestionProjectPayload,
} from "@/api/questions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Eye, EyeOff, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { QuestionItem, QuestionProject } from "@/types/api";

const PROJECT_PAGE_SIZE = 10;
const QUESTION_PAGE_SIZE = 20;
const QUESTION_TYPE_OPTIONS = [
  { value: 0, label: "父子题" },
  { value: 1, label: "选择题" },
  { value: 2, label: "简答题" },
  { value: 3, label: "判断题" },
] as const;
const QUESTION_TYPE_META: Record<
  number,
  {
    label: string;
    answerTypeLabel: string;
    answerLabel: string;
    requiresOptions: boolean;
    badgeClassName: string;
    answerPlaceholder: string;
  }
> = {
  0: {
    label: "父子题",
    answerTypeLabel: "父题说明",
    answerLabel: "父题说明",
    requiresOptions: false,
    badgeClassName: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    answerPlaceholder: "请输入父子题说明",
  },
  1: {
    label: "选择题",
    answerTypeLabel: "选项答案",
    answerLabel: "正确答案",
    requiresOptions: true,
    badgeClassName: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    answerPlaceholder: "请输入正确选项，如 A / AC / 选项内容",
  },
  2: {
    label: "简答题",
    answerTypeLabel: "简答答案",
    answerLabel: "参考答案",
    requiresOptions: false,
    badgeClassName: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    answerPlaceholder: "请输入简答题参考答案",
  },
  3: {
    label: "判断题",
    answerTypeLabel: "判断答案",
    answerLabel: "正确答案",
    requiresOptions: false,
    badgeClassName: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    answerPlaceholder: "请输入判断题答案，如 对 / 错",
  },
};

function getStatusFilterValue(value: string) {
  if (value === "active") return true;
  if (value === "inactive") return false;
  return undefined;
}

function getQuestionTypeMeta(type: number) {
  return (
    QUESTION_TYPE_META[type] ?? {
      label: `类型 ${type}`,
      answerTypeLabel: "通用答案",
      answerLabel: "答案",
      requiresOptions: false,
      badgeClassName: "border-border bg-muted/30 text-muted-foreground",
      answerPlaceholder: "请输入答案",
    }
  );
}

function isNullQuestionParent(parentId: number | null | undefined) {
  return parentId == null || parentId <= 0;
}

function formatQuestionParentLabel(parentId: number | null | undefined) {
  return isNullQuestionParent(parentId) ? "NULL" : `#${parentId}`;
}

function formatQuestionOptions(options: string[]) {
  if (!options.length) {
    return "暂无选项";
  }

  return options.join(" · ");
}

function getQuestionTypeSelectOptions(currentType?: string) {
  if (!currentType || QUESTION_TYPE_OPTIONS.some((item) => String(item.value) === currentType)) {
    return QUESTION_TYPE_OPTIONS;
  }

  return [
    ...QUESTION_TYPE_OPTIONS,
    {
      value: Number(currentType),
      label: `类型 ${currentType}`,
    },
  ].sort((left, right) => left.value - right.value);
}

export default function QuestionsPage() {
  const queryClient = useQueryClient();
  const [projectPage, setProjectPage] = useState(1);
  const [projectKeyword, setProjectKeyword] = useState("");
  const [projectKeywordDraft, setProjectKeywordDraft] = useState("");
  const [projectStatus, setProjectStatus] = useState("all");
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);

  const [questionPage, setQuestionPage] = useState(1);
  const [questionKeyword, setQuestionKeyword] = useState("");
  const [questionKeywordDraft, setQuestionKeywordDraft] = useState("");
  const [questionType, setQuestionType] = useState("all");
  const [questionTypeDraft, setQuestionTypeDraft] = useState("all");
  const [createQuestionOpen, setCreateQuestionOpen] = useState(false);

  const projectsQuery = useQuery({
    queryKey: ["admin-question-projects", projectPage, projectKeyword, projectStatus],
    queryFn: () =>
      listAdminQuestionProjects({
        page: projectPage,
        page_size: PROJECT_PAGE_SIZE,
        keyword: projectKeyword || undefined,
        is_active: getStatusFilterValue(projectStatus),
      }),
  });

  const questionsQuery = useQuery({
    queryKey: ["admin-questions", questionPage, questionKeyword, activeProjectId, questionType],
    queryFn: () =>
      listQuestions({
        page: questionPage,
        page_size: QUESTION_PAGE_SIZE,
        keyword: questionKeyword || undefined,
        project_id: activeProjectId ?? undefined,
        type: questionType === "all" ? undefined : Number(questionType),
      }),
    enabled: activeProjectId !== null,
  });

  const projectMap = useMemo(() => {
    return new Map<number, QuestionProject>((projectsQuery.data?.data ?? []).map((item) => [item.id, item]));
  }, [projectsQuery.data]);

  const createProjectMut = useMutation({
    mutationFn: (payload: QuestionProjectPayload) => createQuestionProject(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-question-projects"] });
      setCreateProjectOpen(false);
      toast.success("题库项目已创建");
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteProjectMut = useMutation({
    mutationFn: (id: number) => deleteQuestionProject(id),
    onSuccess: (_, id) => {
      if (activeProjectId === id) {
        setActiveProjectId(null);
        setQuestionPage(1);
      }
      queryClient.invalidateQueries({ queryKey: ["admin-question-projects"] });
      queryClient.invalidateQueries({ queryKey: ["admin-questions"] });
      toast.success("题库项目已删除");
    },
    onError: (error) => toast.error(error.message),
  });

  const createQuestionMut = useMutation({
    mutationFn: (payload: QuestionPayload) => createQuestion(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-questions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-question-projects"] });
      setCreateQuestionOpen(false);
      toast.success("题目已创建");
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteQuestionMut = useMutation({
    mutationFn: (id: number) => deleteQuestion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-questions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-question-projects"] });
      toast.success("题目已删除");
    },
    onError: (error) => toast.error(error.message),
  });

  const projectTotalPages = Math.max(1, Math.ceil((projectsQuery.data?.total ?? 0) / PROJECT_PAGE_SIZE));
  const questionTotalPages = Math.max(1, Math.ceil((questionsQuery.data?.total ?? 0) / QUESTION_PAGE_SIZE));

  return (
    <div className="grid h-full min-h-0 min-w-0 gap-4 overflow-hidden grid-rows-[minmax(18rem,0.85fr)_minmax(0,1fr)] lg:grid-cols-[380px_minmax(0,1fr)] lg:grid-rows-1">
      <section className="flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden">
        <div className="flex items-center gap-2">
          <form
            className="m-0.5 flex flex-1 items-center gap-3 py-1"
            onSubmit={(event) => {
              event.preventDefault();
              setProjectPage(1);
              setActiveProjectId(null);
              setQuestionPage(1);
              setProjectKeyword(projectKeywordDraft.trim());
            }}
          >
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={projectKeywordDraft}
                onChange={(event) => setProjectKeywordDraft(event.target.value)}
                placeholder="搜索项目"
                className="h-8 pl-7 text-sm"
              />
            </div>
            <Button type="submit" size="sm" variant="outline" className="h-8 text-sm">
              查询
            </Button>
          </form>
          <Dialog open={createProjectOpen} onOpenChange={setCreateProjectOpen}>
            <DialogTrigger asChild>
              <Button type="button" size="sm" className="h-8 gap-1 text-sm">
                <Plus className="h-3.5 w-3.5" />
                新建
              </Button>
            </DialogTrigger>
            <QuestionProjectEditor
              title="新建题库项目"
              confirmText="创建"
              loading={createProjectMut.isPending}
              onSubmit={(payload) => createProjectMut.mutate(payload)}
            />
          </Dialog>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-8 items-center overflow-hidden rounded-lg border text-sm">
            {[
              { value: "all", label: "全部" },
              { value: "active", label: "启用" },
              { value: "inactive", label: "停用" },
            ].map((item) => (
              <button
                key={item.value}
                onClick={() => {
                  setProjectPage(1);
                  setActiveProjectId(null);
                  setQuestionPage(1);
                  setProjectStatus(item.value);
                }}
                className={`h-full px-3 transition-colors ${
                  projectStatus === item.value ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="admin-list-scroll min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain rounded-lg border divide-y [--admin-list-min-width:20rem]">
          {projectsQuery.isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">加载中...</p>
          ) : (
            <>
              {projectsQuery.data?.data.map((project) => (
                <QuestionProjectRow
                  key={project.id}
                  item={project}
                  selected={activeProjectId === project.id}
                  onSelect={() => {
                    setActiveProjectId(project.id);
                    setQuestionPage(1);
                  }}
                  onDelete={() => deleteProjectMut.mutate(project.id)}
                />
              ))}
              {(!projectsQuery.data?.data || projectsQuery.data.data.length === 0) && (
                <p className="py-8 text-center text-sm text-muted-foreground">暂无题库项目</p>
              )}
            </>
          )}
        </div>

        {(projectsQuery.data?.total ?? 0) > PROJECT_PAGE_SIZE && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              第 {projectPage}/{projectTotalPages} 页
            </span>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2 text-sm"
                disabled={projectPage <= 1}
                onClick={() => {
                  setProjectPage(projectPage - 1);
                  setActiveProjectId(null);
                  setQuestionPage(1);
                }}
              >
                上一页
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2 text-sm"
                disabled={projectPage >= projectTotalPages}
                onClick={() => {
                  setProjectPage(projectPage + 1);
                  setActiveProjectId(null);
                  setQuestionPage(1);
                }}
              >
                下一页
              </Button>
            </div>
          </div>
        )}
      </section>

      <section className="flex min-h-0 min-w-0 flex-col gap-4 overflow-hidden lg:border-l lg:border-border/60 lg:pl-4">
        <div className="space-y-2">
          <form
            className="m-0.5 flex items-center gap-3 flex-wrap py-1"
            onSubmit={(event) => {
              event.preventDefault();
              setQuestionPage(1);
              setQuestionKeyword(questionKeywordDraft.trim());
              setQuestionType(questionTypeDraft.trim());
            }}
          >
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={questionKeywordDraft}
                onChange={(event) => setQuestionKeywordDraft(event.target.value)}
                placeholder="搜索题目"
                className="h-8 w-52 pl-7 text-sm"
              />
            </div>
            <Select value={questionTypeDraft} onValueChange={setQuestionTypeDraft}>
              <SelectTrigger size="sm" className="w-32">
                <SelectValue placeholder="全部题型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部题型</SelectItem>
                {QUESTION_TYPE_OPTIONS.map((item) => (
                  <SelectItem key={item.value} value={String(item.value)}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" size="sm" variant="outline" className="h-8 text-sm">
              查询
            </Button>
            <div className="flex justify-end">
          <Dialog open={createQuestionOpen} onOpenChange={setCreateQuestionOpen}>
            <DialogTrigger asChild>
              <Button
                type="button"
                size="sm"
                className="h-8 gap-1 text-sm"
                disabled={activeProjectId === null}
              >
                <Plus className="h-3.5 w-3.5" />
                新建题目
              </Button>
            </DialogTrigger>
            <QuestionEditor
              key={`create-question-${activeProjectId ?? "all"}`}
              title="新建题目"
              confirmText="创建"
              loading={createQuestionMut.isPending}
              projects={projectsQuery.data?.data ?? []}
              defaultProjectId={activeProjectId}
              onSubmit={(payload) => createQuestionMut.mutate(payload)}
            />
          </Dialog>
          </div>
          </form>
        </div>

        <div className="admin-list-scroll min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain rounded-lg border divide-y [--admin-list-min-width:30rem]">
          {activeProjectId === null ? (
            <p className="py-8 text-center text-sm text-muted-foreground">请先选择左侧项目</p>
          ) : questionsQuery.isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">加载中...</p>
          ) : (
            <>
              {questionsQuery.data?.data.map((question) => (
                <QuestionRow
                  key={question.id}
                  item={question}
                  projects={projectsQuery.data?.data ?? []}
                  projectName={projectMap.get(question.project_id)?.name ?? `项目 ${question.project_id}`}
                  onDelete={() => deleteQuestionMut.mutate(question.id)}
                />
              ))}
              {(!questionsQuery.data?.data || questionsQuery.data.data.length === 0) && (
                <p className="py-8 text-center text-sm text-muted-foreground">暂无题目数据</p>
              )}
            </>
          )}
        </div>

        {(questionsQuery.data?.total ?? 0) > QUESTION_PAGE_SIZE && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              共 {questionsQuery.data?.total ?? 0} 条 · 第 {questionPage}/{questionTotalPages} 页
            </p>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2 text-sm"
                disabled={questionPage <= 1}
                onClick={() => setQuestionPage(1)}
              >
                首页
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2 text-sm"
                disabled={questionPage <= 1}
                onClick={() => setQuestionPage(questionPage - 1)}
              >
                上一页
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2 text-sm"
                disabled={questionPage >= questionTotalPages}
                onClick={() => setQuestionPage(questionPage + 1)}
              >
                下一页
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2 text-sm"
                disabled={questionPage >= questionTotalPages}
                onClick={() => setQuestionPage(questionTotalPages)}
              >
                末页
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function QuestionProjectRow({
  item,
  selected,
  onSelect,
  onDelete,
}: {
  item: QuestionProject;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const toggleProjectPayload: QuestionProjectPayload = {
    name: item.name,
    description: item.description,
    version: item.version ?? 1,
    sort: item.sort,
    is_active: !item.is_active,
  };

  const updateMut = useMutation({
    mutationFn: (payload: QuestionProjectPayload) => updateQuestionProject(item.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-question-projects"] });
      setEditOpen(false);
      toast.success("题库项目已更新");
    },
    onError: (error) => toast.error(error.message),
  });

  const toggleMut = useMutation({
    mutationFn: () => updateQuestionProject(item.id, toggleProjectPayload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-question-projects"] });
      queryClient.invalidateQueries({ queryKey: ["admin-questions"] });
      toast.success(item.is_active ? "题库项目已停用" : "题库项目已启用");
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div
      onClick={onSelect}
      className={`group w-full cursor-pointer text-left transition-colors ${
        selected ? "bg-primary/8" : "hover:bg-muted/40"
      }`}
    >
      <div className="flex items-start gap-2 px-3 py-1.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold">{item.name}</span>
            <Badge variant={item.is_active ? "default" : "secondary"} className="text-[10px]">
              {item.is_active ? "启用" : "停用"}
            </Badge>
          </div>
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{item.description || "无描述"}</p>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span>版本 {item.version ?? "-"}</span>
            <span>排序 {item.sort}</span>
            {typeof item.question_count === "number" && <span>{item.question_count} 题</span>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5" onClick={(event) => event.stopPropagation()}>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => toggleMut.mutate()}
            disabled={toggleMut.isPending}
            title={item.is_active ? "停用" : "启用"}
          >
            {item.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </Button>
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button size="icon" variant="ghost" className="h-6 w-6">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </DialogTrigger>
            <QuestionProjectEditor
              title={`编辑项目 #${item.id}`}
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
                <AlertDialogTitle>确认删除题库项目</AlertDialogTitle>
                <AlertDialogDescription>
                  删除后该项目下题目需由后端自行保证一致性，请确认。
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
    </div>
  );
}

function QuestionRow({
  item,
  projects,
  projectName,
  onDelete,
}: {
  item: QuestionItem;
  projects: QuestionProject[];
  projectName: string;
  onDelete: () => void;
}) {
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const optionCount = Array.isArray(item.options) ? item.options.length : 0;
  const typeMeta = getQuestionTypeMeta(item.type);
  const parentId = isNullQuestionParent(item.parent_id) ? null : item.parent_id;
  const isFamilyQuestion = item.type !== 0 && (parentId !== null || (item.sub_questions?.length ?? 0) > 0);

  const updateMut = useMutation({
    mutationFn: (payload: QuestionPayload) => updateQuestion(item.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-questions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-question-projects"] });
      setEditOpen(false);
      toast.success("题目已更新");
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="group flex w-full min-w-0 items-start gap-3 px-3 py-2 hover:bg-muted/40 transition-colors">
      <span className="w-14 shrink-0 pt-0.5 text-xs font-mono text-muted-foreground">#{item.id}</span>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{item.title}</p>
          <Badge variant="outline" className={`shrink-0 text-[10px] ${typeMeta.badgeClassName}`}>
            {typeMeta.label}
          </Badge>
          {isFamilyQuestion ? (
            <Badge variant="outline" className="shrink-0 text-[10px] text-muted-foreground">
              父子题
            </Badge>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="truncate">{projectName}</span>
          <span>排序 {item.sort}</span>
          <span>父题 {formatQuestionParentLabel(parentId)}</span>
        </div>
        {typeMeta.requiresOptions && (
          <p className="truncate text-xs text-muted-foreground">
            选项 {optionCount} 个 · {formatQuestionOptions(item.options)}
          </p>
        )}
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <span className="shrink-0">{typeMeta.answerLabel}</span>
          <span className={item.type === 2 ? "line-clamp-1" : "truncate"}>{item.answer || "-"}</span>
        </div>
      </div>
      <div className="flex w-20 shrink-0 flex-col items-end gap-1">
        <Badge variant={item.is_active ? "default" : "secondary"} className="px-2 text-[10px]">
          {item.is_active ? "启用" : "停用"}
        </Badge>
      </div>
      <div className="flex w-20 shrink-0 items-center justify-end gap-0.5 pt-0.5">
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger asChild>
            <Button size="icon" variant="ghost" className="h-6 w-6">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </DialogTrigger>
          <QuestionEditor
            title={`编辑题目 #${item.id}`}
            confirmText="保存"
            loading={updateMut.isPending}
            projects={projects}
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
              <AlertDialogTitle>确认删除题目</AlertDialogTitle>
              <AlertDialogDescription>删除后不可恢复，请确认该题目不再需要。</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={onDelete}>
                删除
              </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        {parentId == null ? null : <QuestionFamilyDialog item={item} projects={projects} />}
      </div>
    </div>
  );
}

function QuestionFamilyDialog({ item, projects }: { item: QuestionItem; projects: QuestionProject[] }) {
  const [open, setOpen] = useState(false);
  const familyRootId = item.parent_id ?? item.id;
  const familyQuery = useQuery({
    queryKey: ["admin-question-family", familyRootId],
    queryFn: () => getQuestion(familyRootId),
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-6 w-6" title="查看父题">
          <Eye className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-4xl overflow-auto">
        <DialogHeader>
          <DialogTitle>父子题预览</DialogTitle>
        </DialogHeader>
        {familyQuery.isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">加载题组中...</p>
        ) : familyQuery.error ? (
          <p className="py-8 text-center text-sm text-destructive">{familyQuery.error.message}</p>
        ) : familyQuery.data ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>父题 #{familyQuery.data.id}</span>
              <span>共 {(familyQuery.data.sub_questions?.length ?? 0) + 1} 题</span>
              <span>当前定位 #{item.id}</span>
            </div>
            <QuestionFamilyCard item={familyQuery.data} projects={projects} activeId={item.id} />
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">未获取到父题数据</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function QuestionFamilyCard({
  item,
  projects,
  activeId,
  level = 0,
}: {
  item: QuestionItem;
  projects: QuestionProject[];
  activeId: number;
  level?: number;
}) {
  const typeMeta = getQuestionTypeMeta(item.type);
  const projectName = projects.find((project) => project.id === item.project_id)?.name ?? `项目 ${item.project_id}`;
  const children = [...(item.sub_questions ?? [])].sort((left, right) => {
    if (left.sort !== right.sort) {
      return left.sort - right.sort;
    }

    return left.id - right.id;
  });

  return (
    <div className={`rounded-lg border ${activeId === item.id ? "border-primary/40 bg-primary/5" : "bg-card"}`}>
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2 text-xs">
        <Badge variant={activeId === item.id ? "default" : "outline"} className="text-[10px]">
          {level === 0 ? "父题" : "子题"}
        </Badge>
        <Badge variant="outline" className={`text-[10px] ${typeMeta.badgeClassName}`}>
          {typeMeta.label}
        </Badge>
        <span className="text-muted-foreground">{projectName}</span>
        <span className="text-muted-foreground">#{item.id}</span>
        <span className="text-muted-foreground">排序 {item.sort}</span>
        <span className="text-muted-foreground">父题 {formatQuestionParentLabel(item.parent_id)}</span>
      </div>
      <div className="space-y-3 p-3">
        <p className="text-sm font-medium whitespace-pre-wrap wrap-break-word">{item.title}</p>
        {typeMeta.requiresOptions && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">选项</p>
            <div className="grid gap-1.5">
              {item.options.map((option, index) => (
                <div key={`${item.id}-${index}`} className="rounded-md border bg-muted/20 px-2.5 py-2 text-sm">
                  <span className="wrap-break-word">{option}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="rounded-md bg-muted/40 px-3 py-2">
          <p className="text-xs text-muted-foreground">{typeMeta.answerLabel}</p>
          <p className={`mt-1 text-sm whitespace-pre-wrap wrap-break-word ${item.type === 2 ? "line-clamp-1" : ""}`}>
            {item.answer || "暂无答案"}
          </p>
        </div>
      </div>
      {children.length > 0 && (
        <div className="space-y-3 border-t bg-muted/10 p-3">
          {children.map((child) => (
            <QuestionFamilyCard
              key={child.id}
              item={child}
              projects={projects}
              activeId={activeId}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionProjectEditor({
  title,
  confirmText,
  loading,
  initialValue,
  onSubmit,
}: {
  title: string;
  confirmText: string;
  loading: boolean;
  initialValue?: QuestionProject;
  onSubmit: (payload: QuestionProjectPayload) => void;
}) {
  const [name, setName] = useState(initialValue?.name ?? "");
  const [description, setDescription] = useState(initialValue?.description ?? "");
  const [version, setVersion] = useState(String(initialValue?.version ?? 1));
  const [sort, setSort] = useState(String(initialValue?.sort ?? 0));
  const [isActive, setIsActive] = useState(initialValue?.is_active ?? true);

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1">
          <Label>项目名称</Label>
          <Input value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>描述</Label>
          <Textarea value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-24" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label>版本</Label>
            <Input value={version} onChange={(event) => setVersion(event.target.value)} type="number" />
          </div>
          <div className="space-y-1">
            <Label>排序</Label>
            <Input value={sort} onChange={(event) => setSort(event.target.value)} type="number" />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg border px-3 py-2">
          <div>
            <p className="text-sm font-medium">启用状态</p>
            <p className="text-xs text-muted-foreground">停用后仍可在后台维护，但不会对外启用。</p>
          </div>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>
      </div>
      <DialogFooter>
        <Button
          onClick={() =>
            onSubmit({
              name: name.trim(),
              description: description.trim(),
              version: Number(version),
              sort: Number(sort),
              is_active: isActive,
            })
          }
          disabled={loading || !name.trim() || description.trim() === "" || version.trim() === "" || sort.trim() === ""}
        >
          {confirmText}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function QuestionEditor({
  title,
  confirmText,
  loading,
  projects,
  initialValue,
  defaultProjectId,
  onSubmit,
}: {
  title: string;
  confirmText: string;
  loading: boolean;
  projects: QuestionProject[];
  initialValue?: QuestionItem;
  defaultProjectId?: number | null;
  onSubmit: (payload: QuestionPayload) => void;
}) {
  const isEditMode = Boolean(initialValue);
  const [projectId, setProjectId] = useState(String(initialValue?.project_id ?? defaultProjectId ?? ""));
  const [parentMode, setParentMode] = useState<"null" | "id">(isNullQuestionParent(initialValue?.parent_id) ? "null" : "id");
  const [parentId, setParentId] = useState(isNullQuestionParent(initialValue?.parent_id) ? "" : String(initialValue?.parent_id));
  const [type, setType] = useState(String(initialValue?.type ?? 1));
  const [titleValue, setTitleValue] = useState(initialValue?.title ?? "");
  const [optionsValue, setOptionsValue] = useState((initialValue?.options ?? []).join("\n"));
  const [answer, setAnswer] = useState(initialValue?.answer ?? "");
  const [sort, setSort] = useState(String(initialValue?.sort ?? 0));
  const [isActive, setIsActive] = useState(initialValue?.is_active ?? true);
  const typeMeta = getQuestionTypeMeta(Number(type));
  const typeOptions = getQuestionTypeSelectOptions(type);

  const parsedOptions = optionsValue
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
  const parentIdValue = parentMode === "null" ? null : Number(parentId);
  const optionsForSubmit = typeMeta.requiresOptions ? parsedOptions : [];

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className={`grid gap-3 ${isEditMode ? "md:grid-cols-1" : "md:grid-cols-3"}`}>
          {isEditMode ? null : (
            <div className="space-y-1 md:col-span-2">
              <Label>所属项目</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="选择题库项目" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={String(project.id)}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <Label>题目类型</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue placeholder="选择题型" />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((item) => (
                  <SelectItem key={item.value} value={String(item.value)}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label>父题</Label>
            <Select value={parentMode} onValueChange={(value) => setParentMode(value as "null" | "id")}>
              <SelectTrigger>
                <SelectValue placeholder="父题类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="null">NULL</SelectItem>
                <SelectItem value="id">指定父题 ID</SelectItem>
              </SelectContent>
            </Select>
            {parentMode === "id" && (
              <Input
                value={parentId}
                onChange={(event) => setParentId(event.target.value)}
                type="number"
                placeholder="请输入父题 ID"
              />
            )}
            <p className="text-xs text-muted-foreground">根题请选择 NULL，只有子题才需要填写父题 ID。</p>
          </div>
          <div className="space-y-1">
            <Label>排序</Label>
            <Input value={sort} onChange={(event) => setSort(event.target.value)} type="number" />
          </div>
        </div>
        <div className="space-y-1">
          <Label>题目标题</Label>
          <Textarea value={titleValue} onChange={(event) => setTitleValue(event.target.value)} className="min-h-24" />
        </div>
        {typeMeta.requiresOptions && (
          <div className="space-y-1">
            <Label>选项</Label>
            <Textarea
              value={optionsValue}
              onChange={(event) => setOptionsValue(event.target.value)}
              className="min-h-28"
              placeholder="每行一个选项"
            />
          </div>
        )}
        <div className="space-y-1">
          <Label>{typeMeta.answerLabel}</Label>
          {Number(type) === 2 ? (
            <Textarea
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              className="min-h-24"
              placeholder={typeMeta.answerPlaceholder}
            />
          ) : (
            <Input
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder={typeMeta.answerPlaceholder}
            />
          )}
        </div>
        <div className="flex items-center justify-between rounded-lg border px-3 py-2">
          <div>
            <p className="text-sm font-medium">启用状态</p>
            <p className="text-xs text-muted-foreground">
              {typeMeta.requiresOptions ? `当前共识别到 ${parsedOptions.length} 个选项。` : `${typeMeta.label} 不展示选项。`}
            </p>
          </div>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>
      </div>
      <DialogFooter>
        <Button
          onClick={() =>
            onSubmit({
              project_id: Number(projectId),
              parent_id: parentIdValue,
              type: Number(type),
              title: titleValue.trim(),
              options: optionsForSubmit,
              answer: answer.trim(),
              sort: Number(sort),
              is_active: isActive,
            })
          }
          disabled={
            loading ||
            !projectId ||
            !titleValue.trim() ||
            !answer.trim() ||
            type.trim() === "" ||
            sort.trim() === "" ||
            (parentMode === "id" && !parentId.trim()) ||
            (typeMeta.requiresOptions && parsedOptions.length === 0)
          }
        >
          {confirmText}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
