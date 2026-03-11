import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCourseTable,
  deleteCourseTable,
  listCourseTables,
  updateCourseTable,
  type CourseTablePayload,
} from "@/api/course-tables";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { CourseTable } from "@/types/api";

const PAGE_SIZE = 20;
const DAY_LABELS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"] as const;
const PERIOD_LABELS = ["第一节", "第二节", "第三节", "第四节", "第五节"] as const;
const PERIOD_TIME_RANGES = [
  ["08:30", "10:05"],
  ["10:25", "12:00"],
  ["14:00", "15:35"],
  ["15:55", "17:30"],
  ["19:00", "20:35"],
] as const;

interface TimetableCourseEntry {
  id: string;
  course: string;
  teacher: string;
  classroom: string;
  weekText: string;
  activeWeeks: number[];
}

function normalizeWeekText(value: string) {
  return value
    .replace(/\s+/g, "")
    .replace(/（/g, "(")
    .replace(/）/g, ")")
    .replace(/[，、；;]/g, ",");
}

function parseWeekText(weekText: string) {
  const normalized = normalizeWeekText(weekText);
  const tokens = normalized.match(/\d+\s*-\s*\d+|\d+/g) ?? [];
  const onlyOddWeeks = normalized.includes("单");
  const onlyEvenWeeks = normalized.includes("双");
  const weeks = new Set<number>();

  for (const token of tokens) {
    if (token.includes("-")) {
      const [rawStart, rawEnd] = token.split("-");
      const start = Number(rawStart);
      const end = Number(rawEnd);
      if (Number.isNaN(start) || Number.isNaN(end)) {
        continue;
      }
      for (let week = Math.min(start, end); week <= Math.max(start, end); week += 1) {
        weeks.add(week);
      }
      continue;
    }

    const week = Number(token);
    if (!Number.isNaN(week)) {
      weeks.add(week);
    }
  }

  return [...weeks]
    .filter((week) => !onlyOddWeeks || week % 2 === 1)
    .filter((week) => !onlyEvenWeeks || week % 2 === 0)
    .sort((left, right) => left - right);
}

function getObjectString(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string") {
      return value.trim();
    }
  }
  return "";
}

function parseCourseEntries(slotIndex: number, value: unknown) {
  if (!Array.isArray(value)) {
    return [] as TimetableCourseEntry[];
  }

  return value.flatMap((item, itemIndex) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return [];
    }

    const record = item as Record<string, unknown>;
    const course = getObjectString(record, ["course", "course_name", "name", "title"]);
    if (!course) {
      return [];
    }

    const teacher = getObjectString(record, ["teacher", "teacher_name", "teachers"]);
    const classroom = getObjectString(record, ["classroom", "room", "location", "place"]);
    const weekText = getObjectString(record, ["week", "weeks", "week_text", "weekRange"]);

    return [{
      id: `${slotIndex}-${itemIndex}-${course}`,
      course,
      teacher,
      classroom,
      weekText,
      activeWeeks: weekText ? parseWeekText(weekText) : [],
    }];
  });
}

function parseTimetable(courseData: Record<string, unknown>) {
  return Array.from({ length: 35 }, (_, slotIndex) => parseCourseEntries(slotIndex + 1, courseData[String(slotIndex + 1)]));
}

function isCourseActiveInWeek(entry: TimetableCourseEntry, week: number) {
  return entry.activeWeeks.length === 0 || entry.activeWeeks.includes(week);
}

function collectWeekOptions(slots: TimetableCourseEntry[][]) {
  const weeks = new Set<number>();

  for (const entries of slots) {
    for (const entry of entries) {
      for (const week of entry.activeWeeks) {
        weeks.add(week);
      }
    }
  }

  const sortedWeeks = [...weeks].sort((left, right) => left - right);
  if (sortedWeeks.length > 0) {
    return sortedWeeks;
  }

  return Array.from({ length: 20 }, (_, index) => index + 1);
}

const COURSE_CARD_TONES = [
  {
    active: "bg-sky-200 text-sky-950",
    dotActive: "bg-sky-500",
    dotInactive: "bg-sky-200",
  },
  {
    active: "bg-emerald-200 text-emerald-950",
    dotActive: "bg-emerald-500",
    dotInactive: "bg-emerald-200",
  },
  {
    active: "bg-amber-200 text-amber-950",
    dotActive: "bg-amber-500",
    dotInactive: "bg-amber-200",
  },
  {
    active: "bg-rose-200 text-rose-950",
    dotActive: "bg-rose-500",
    dotInactive: "bg-rose-200",
  },
  {
    active: "bg-violet-200 text-violet-950",
    dotActive: "bg-violet-500",
    dotInactive: "bg-violet-200",
  },
  {
    active: "bg-cyan-200 text-cyan-950",
    dotActive: "bg-cyan-500",
    dotInactive: "bg-cyan-200",
  },
] as const;

const INACTIVE_COURSE_TONE = {
  active: "bg-zinc-200 text-zinc-700",
  dotActive: "bg-zinc-500",
  dotInactive: "bg-zinc-200",
} as const;

function getCourseTone(entry: TimetableCourseEntry, isCurrentWeekCourse: boolean) {
  if (!isCurrentWeekCourse) {
    return INACTIVE_COURSE_TONE;
  }

  const seed = `${entry.course}-${entry.teacher}-${entry.classroom}`;
  let hash = 0;

  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return COURSE_CARD_TONES[hash % COURSE_CARD_TONES.length];
}

function getCourseCardTone(entry: TimetableCourseEntry, isCurrentWeekCourse: boolean) {
  return getCourseTone(entry, isCurrentWeekCourse).active;
}

function getVisibleDotIndices(total: number, activeIndex: number, maxDots = 5) {
  if (total <= maxDots) {
    return Array.from({ length: total }, (_, index) => index);
  }

  const maxStart = total - maxDots;
  const centeredStart = activeIndex - Math.floor(maxDots / 2);
  const startIndex = Math.max(0, Math.min(centeredStart, maxStart));

  return Array.from({ length: maxDots }, (_, offset) => startIndex + offset);
}

function TimetableCourseCard({ entry, isCurrentWeekCourse }: { entry: TimetableCourseEntry; isCurrentWeekCourse: boolean }) {
  return (
    <div
      className={`flex h-full w-full shrink-0 snap-start flex-col overflow-hidden rounded-none px-2 py-2 text-xs leading-4 transition-colors ${getCourseCardTone(entry, isCurrentWeekCourse)}`}
    >
      <p
        className="overflow-hidden text-sm font-semibold leading-4.5"
        style={{
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}
      >
        {entry.course}
      </p>
      {entry.teacher && <p className="mt-1 truncate text-[11px] leading-4">{entry.teacher}</p>}
      {entry.classroom && <p className="mt-0.5 truncate text-[11px] leading-4 text-left">{entry.classroom}</p>}
      {entry.weekText && <p className="truncate text-[11px] leading-4 text-left">{entry.weekText}</p>}
    </div>
  );
}

function TimetableSlotCarousel({ entries, currentWeek }: { entries: TimetableCourseEntry[]; currentWeek: number }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const visibleDotIndices = getVisibleDotIndices(entries.length, activeIndex);
  const activeEntry = entries[activeIndex] ?? entries[0];
  const activeEntryTone = activeEntry
    ? getCourseTone(activeEntry, isCourseActiveInWeek(activeEntry, currentWeek))
    : INACTIVE_COURSE_TONE;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      if (entries.length <= 1) {
        return;
      }

      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (delta === 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      container.scrollBy({ left: delta, behavior: "smooth" });
    };

    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [entries.length]);

  return (
    <div className="relative h-full min-h-0 rounded-md bg-background/90 overflow-hidden">
      <div
        ref={containerRef}
        className="scrollbar-hidden flex h-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-contain touch-pan-x scroll-smooth"
        onScroll={(event) => {
          const { scrollLeft, clientWidth } = event.currentTarget;
          if (clientWidth === 0) {
            return;
          }

          const nextIndex = Math.min(entries.length - 1, Math.max(0, Math.round(scrollLeft / clientWidth)));
          setActiveIndex((currentIndex) => (currentIndex === nextIndex ? currentIndex : nextIndex));
        }}
      >
        {entries.map((entry) => (
          <TimetableCourseCard
            key={entry.id}
            entry={entry}
            isCurrentWeekCourse={isCourseActiveInWeek(entry, currentWeek)}
          />
        ))}
      </div>
      {entries.length > 1 && (
        <div className="pointer-events-none absolute bottom-1.5 right-1.5 z-10 flex items-center gap-0.5 rounded-full bg-white/55 px-1 py-0.5 backdrop-blur-[2px]">
          {visibleDotIndices.map((entryIndex) => (
            <span
              key={`${entries[entryIndex]?.id ?? entryIndex}-dot`}
              className={`h-2 w-2 rounded-full transition-colors ${entryIndex === activeIndex ? activeEntryTone.dotActive : activeEntryTone.dotInactive}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function stringifyCourseData(courseData: Record<string, unknown>) {
  return JSON.stringify(courseData, null, 2);
}

function parseCourseData(raw: string) {
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error("课表数据必须是 JSON 对象");
  }
  return parsed as Record<string, unknown>;
}

export default function CourseTablesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [semester, setSemester] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedCourseTableId, setSelectedCourseTableId] = useState<number | null>(null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["course-tables", page, keyword, semester],
    queryFn: () =>
      listCourseTables({
        page,
        page_size: PAGE_SIZE,
        keyword: keyword || undefined,
        semester: semester || undefined,
      }),
    placeholderData: (previousData) => previousData,
  });

  const createMut = useMutation({
    mutationFn: (payload: CourseTablePayload) => createCourseTable(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-tables"] });
      setCreateOpen(false);
      toast.success("课表已创建");
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteCourseTable(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-tables"] });
      toast.success("课表已删除");
    },
    onError: (error) => toast.error(error.message),
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const courseTables = useMemo(() => data?.data ?? [], [data?.data]);
  const selectedCourseTable = courseTables.find((item) => item.id === selectedCourseTableId) ?? courseTables[0] ?? null;

  return (
    <div className="flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-y-auto lg:overflow-hidden">
      {isLoading && !data ? (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">加载中...</p>
        </div>
      ) : (
        <div className="grid h-[150svh] min-h-[150svh] w-full min-w-0 max-w-full gap-4 grid-rows-[70svh_minmax(0,1fr)] lg:h-full lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1.0fr)_minmax(22rem,0.9fr)] lg:grid-rows-1">
          <div className="h-[70svh] min-h-[70svh] min-w-0 overflow-hidden p-1 lg:h-auto lg:min-h-0">
            <CourseTablePreviewPanel item={selectedCourseTable} />
          </div>

          <div className="flex min-h-0 min-w-0 flex-col gap-4 overflow-hidden p-1 lg:h-full lg:grid lg:grid-rows-[auto_minmax(0,1fr)_auto]">
            <CourseTableFilters
              initialKeyword={keyword}
              initialSemester={semester}
              isFetching={isFetching}
              createOpen={createOpen}
              createLoading={createMut.isPending}
              onSearch={(nextKeyword, nextSemester) => {
                setPage(1);
                setKeyword(nextKeyword);
                setSemester(nextSemester);
              }}
              onCreateOpenChange={setCreateOpen}
              onCreateSubmit={(payload) => createMut.mutate(payload)}
            />

            <div className="min-h-0 flex-1 overflow-hidden lg:h-full">
              <div className="admin-list-scroll relative h-full rounded-lg border divide-y overflow-auto overscroll-contain">
                {isFetching && (
                  <div className="pointer-events-none sticky top-0 z-10 flex justify-center bg-background/80 py-2 text-xs text-muted-foreground backdrop-blur-sm">
                    加载中...
                  </div>
                )}
                {courseTables.map((item) => (
                  <CourseTableRow
                    key={item.id}
                    item={item}
                    selected={selectedCourseTable?.id === item.id}
                    onSelect={() => setSelectedCourseTableId(item.id)}
                    onDelete={() => deleteMut.mutate(item.id)}
                  />
                ))}
                {courseTables.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">暂无课表数据</p>
                )}
              </div>
            </div>

            {total > PAGE_SIZE && (
              <div className="shrink-0 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  共 {total} 条 · 第 {page}/{totalPages} 页
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-2 text-sm"
                    disabled={page <= 1}
                    onClick={() => setPage(1)}
                  >
                    首页
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-2 text-sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    上一页
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-2 text-sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    下一页
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-2 text-sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage(totalPages)}
                  >
                    末页
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CourseTableFilters({
  initialKeyword,
  initialSemester,
  isFetching,
  createOpen,
  createLoading,
  onSearch,
  onCreateOpenChange,
  onCreateSubmit,
}: {
  initialKeyword: string;
  initialSemester: string;
  isFetching: boolean;
  createOpen: boolean;
  createLoading: boolean;
  onSearch: (keyword: string, semester: string) => void;
  onCreateOpenChange: (open: boolean) => void;
  onCreateSubmit: (payload: CourseTablePayload) => void;
}) {
  const [keywordDraft, setKeywordDraft] = useState(initialKeyword);
  const [semesterDraft, setSemesterDraft] = useState(initialSemester);

  useEffect(() => {
    setKeywordDraft(initialKeyword);
  }, [initialKeyword]);

  useEffect(() => {
    setSemesterDraft(initialSemester);
  }, [initialSemester]);

  return (
    <div className="shrink-0 flex items-center gap-2 flex-wrap">
      <form
        className="m-0.5 flex items-center gap-3 flex-wrap py-1"
        onSubmit={(event) => {
          event.preventDefault();
          onSearch(keywordDraft.trim(), semesterDraft.trim());
        }}
      >
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={keywordDraft}
            onChange={(event) => setKeywordDraft(event.target.value)}
            placeholder="搜索班级或课表"
            className="h-8 w-44 pl-7 text-sm"
          />
        </div>
        <Input
          value={semesterDraft}
          onChange={(event) => setSemesterDraft(event.target.value)}
          placeholder="学期"
          className="h-8 w-36 text-sm"
        />
        <Button type="submit" size="sm" variant="outline" className="h-8 text-sm">
          查询
        </Button>
        {isFetching && <span className="text-xs text-muted-foreground">加载中...</span>}
      </form>
      <Dialog open={createOpen} onOpenChange={onCreateOpenChange}>
        <DialogTrigger asChild>
          <Button type="button" size="sm" className="ml-auto h-8 gap-1 text-sm">
            <Plus className="h-3.5 w-3.5" />
            新建课表
          </Button>
        </DialogTrigger>
        <CourseTableEditor
          title="新建课表"
          confirmText="创建"
          loading={createLoading}
          onSubmit={onCreateSubmit}
        />
      </Dialog>
    </div>
  );
}

function CourseTableRow({
  item,
  selected,
  onSelect,
  onDelete,
}: {
  item: CourseTable;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const updateMut = useMutation({
    mutationFn: (payload: CourseTablePayload) => updateCourseTable(item.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-tables"] });
      setEditOpen(false);
      toast.success("课表已更新");
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div
      className={`group flex cursor-pointer items-center justify-between gap-2 px-3 py-2 transition-colors [--admin-list-min-width:30rem] ${
        selected ? "bg-primary/5 ring-1 ring-inset ring-primary/20" : "hover:bg-muted/40"
      }`}
      onClick={onSelect}
    >
      <span className="w-14 shrink-0 text-xs font-mono text-muted-foreground">#{item.id}</span>
      <span className="w-36 shrink-0 truncate text-sm font-medium">{item.class_id}</span>
      <Badge variant="outline" className="shrink-0 justify-center text-[10px]">
        {item.semester}
      </Badge>
      <span className="w-28 shrink-0 text-right text-xs text-muted-foreground hidden md:inline">
        {new Date(item.updated_at).toLocaleDateString()}
      </span>
      <div className="flex w-20 shrink-0 items-center justify-end gap-0.5" onClick={(event) => event.stopPropagation()}>
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger asChild>
            <Button size="icon" variant="ghost" className="h-6 w-6">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </DialogTrigger>
          <CourseTableEditor
            title={`编辑课表 #${item.id}`}
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
              <AlertDialogTitle>确认删除课表</AlertDialogTitle>
              <AlertDialogDescription>
                将删除班级 {item.class_id} 在 {item.semester} 的课表数据。
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
  );
}

function CourseTablePreviewPanel({ item }: { item: CourseTable | null }) {
  if (!item) {
    return (
      <div className="mx-auto flex h-full min-h-0 w-full self-start items-center justify-center rounded-lg border border-dashed bg-muted/10 p-6 text-base text-muted-foreground xl:mx-0">
        当前没有可显示的课表，请先筛选或新增课表数据。
      </div>
    );
  }

  return <CourseTablePreviewContent key={item.id} item={item} />;
}

function CourseTablePreviewContent({ item }: { item: CourseTable }) {
  const slots = useMemo(() => parseTimetable(item.course_data), [item.course_data]);
  const weekOptions = useMemo(() => collectWeekOptions(slots), [slots]);
  const [selectedWeek, setSelectedWeek] = useState(String(weekOptions[0] ?? 1));
  const [showWeekend, setShowWeekend] = useState(false);
  const [showNonCurrentCourses, setShowNonCurrentCourses] = useState(true);

  const visibleDays = showWeekend ? [0, 1, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4];
  const currentWeek = weekOptions.includes(Number(selectedWeek)) ? Number(selectedWeek) : (weekOptions[0] ?? 1);

  return (
    <div className="mx-auto flex h-full min-h-0 w-full self-start flex-col gap-4 rounded-lg xl:mx-0">
      <div className="shrink-0 flex items-center gap-3 flex-wrap text-base py-1 m-0.5">
        <div>
          <Select value={String(currentWeek)} onValueChange={setSelectedWeek}>
            <SelectTrigger size="sm" className="h-10 w-30 text-base">
              <SelectValue placeholder="选择周次" />
            </SelectTrigger>
            <SelectContent>
              {weekOptions.map((week) => (
                <SelectItem key={week} value={String(week)}>
                  第 {week} 周
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 h-8">
          <Switch checked={showWeekend} onCheckedChange={setShowWeekend} />
          <span className="text-base">显示周末</span>
        </div>
        <div className="flex items-center gap-2 h-8">
          <Switch checked={showNonCurrentCourses} onCheckedChange={setShowNonCurrentCourses} />
          <span className="text-base">显示非本周课程</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-xl bg-muted/20 p-1.5">
        <div className="admin-list-scroll h-full overflow-auto [--admin-list-min-width:20rem]">
          <div
            className="grid min-h-full w-full gap-1"
            style={{
              minWidth: `calc(4rem + ${visibleDays.length} * 4.25rem)`,
              gridTemplateColumns: `4rem repeat(${visibleDays.length}, minmax(4.25rem, 1fr))`,
              gridTemplateRows: "2rem repeat(5, 8rem)",
            }}
          >
          <div className="flex h-full items-center justify-center rounded-md bg-muted/40 px-1.5 py-2 text-center text-sm font-medium text-muted-foreground">
            <span>节次</span>
          </div>
          {visibleDays.map((dayIndex) => (
            <div
              key={DAY_LABELS[dayIndex]}
              className="flex h-full items-center justify-center rounded-md bg-muted/40 px-2 py-1.5 text-center text-sm font-medium"
            >
              {DAY_LABELS[dayIndex]}
            </div>
          ))}

          {PERIOD_LABELS.map((periodLabel, periodIndex) => (
            <Fragment key={periodLabel}>
              <div
                key={`period-${periodLabel}`}
                className="flex h-full min-h-0 flex-col items-center justify-center rounded-md bg-background/90 px-1 py-2 text-center text-xs font-medium leading-4 text-muted-foreground"
              >
                <span>{periodLabel}</span>
                <span className="mt-1 text-[11px] leading-4 text-foreground/80">
                  {PERIOD_TIME_RANGES[periodIndex][0]}
                </span>
                <span className="text-[11px] leading-4 text-foreground/80">
                  {PERIOD_TIME_RANGES[periodIndex][1]}
                </span>
              </div>
              {visibleDays.map((dayIndex) => {
                const slotIndex = dayIndex * PERIOD_LABELS.length + periodIndex;
                const entries = slots[slotIndex] ?? [];
                const displayEntries = showNonCurrentCourses
                  ? [...entries].sort((left, right) => Number(isCourseActiveInWeek(right, currentWeek)) - Number(isCourseActiveInWeek(left, currentWeek)))
                  : entries.filter((entry) => isCourseActiveInWeek(entry, currentWeek));

                return (
                  <div key={`${dayIndex}-${periodIndex}`} className="h-full min-h-0">
                    {displayEntries.length > 0 && <TimetableSlotCarousel entries={displayEntries} currentWeek={currentWeek} />}
                  </div>
                );
              })}
            </Fragment>
          ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CourseTableEditor({
  title,
  confirmText,
  loading,
  initialValue,
  onSubmit,
}: {
  title: string;
  confirmText: string;
  loading: boolean;
  initialValue?: CourseTable;
  onSubmit: (payload: CourseTablePayload) => void;
}) {
  const [classId, setClassId] = useState(initialValue?.class_id ?? "");
  const [semester, setSemester] = useState(initialValue?.semester ?? "");
  const [courseData, setCourseData] = useState(
    initialValue ? stringifyCourseData(initialValue.course_data) : "{\n  \n}",
  );

  const handleSubmit = () => {
    try {
      onSubmit({
        class_id: classId.trim(),
        semester: semester.trim(),
        course_data: parseCourseData(courseData),
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "课表 JSON 无效");
    }
  };

  return (
    <DialogContent className="w-[calc(100vw-2rem)] max-w-xl">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label>班级 ID</Label>
            <Input value={classId} onChange={(event) => setClassId(event.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>学期</Label>
            <Input value={semester} onChange={(event) => setSemester(event.target.value)} />
          </div>
        </div>
        <div className="space-y-1">
          <Label>课表 JSON</Label>
          <Textarea
            value={courseData}
            onChange={(event) => setCourseData(event.target.value)}
            className="min-h-56 max-h-[50vh] font-mono text-xs"
          />
        </div>
      </div>
      <DialogFooter>
        <Button
          onClick={handleSubmit}
          disabled={loading || !classId.trim() || !semester.trim() || !courseData.trim()}
        >
          {confirmText}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
