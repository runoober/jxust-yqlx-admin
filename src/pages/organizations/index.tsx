import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createOrganization,
  deleteOrganization,
  getOrganization,
  listOrganizations,
  updateOrganization,
  type OrganizationPayload,
} from "@/api/organizations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  Eye,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Search,
  Shield,
  Trash2,
  Users,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { Organization } from "@/types/api";

const PAGE_SIZE = 10;

const EMPTY_FILTERS = {
  query: "",
  organization_type: "",
  affiliation: "",
  campus: "",
};

const EMPTY_FORM: OrganizationFormValues = {
  name: "",
  organization_type: "",
  affiliation: "",
  campus: "",
  introduction: "",
  contact: "",
};

const FIELD_LABELS: Record<keyof OrganizationFormValues, string> = {
  name: "组织名称",
  organization_type: "组织类型",
  affiliation: "组织所属",
  campus: "校区",
  introduction: "组织介绍",
  contact: "联系方式",
};

type FilterState = typeof EMPTY_FILTERS;

type OrganizationFormValues = {
  name: string;
  organization_type: string;
  affiliation: string;
  campus: string;
  introduction: string;
  contact: string;
};

export default function OrganizationsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [draftFilters, setDraftFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);

  const { data, isLoading } = useQuery({
    queryKey: ["organizations", page, filters],
    queryFn: () =>
      listOrganizations({
        page,
        page_size: PAGE_SIZE,
        query: filters.query || undefined,
        organization_type: filters.organization_type || undefined,
        affiliation: filters.affiliation || undefined,
        campus: filters.campus || undefined,
      }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteOrganization,
    onSuccess: () => {
      if ((data?.data.length ?? 0) <= 1 && page > 1) {
        setPage((current) => current - 1);
      }
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success("组织已删除");
    },
    onError: (error) => toast.error(error.message),
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleSubmitFilters = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setFilters(normalizeFilters(draftFilters));
  };

  const handleResetFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
    setPage(1);
  };

  return (
    <div className="flex min-h-0 w-full flex-col gap-4 overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
        <form className="flex flex-1 flex-wrap items-center gap-2 p-0.5" onSubmit={handleSubmitFilters}>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={draftFilters.query}
              onChange={(event) => setDraftFilters((current) => ({ ...current, query: event.target.value }))}
              placeholder="搜索名称、介绍、联系方式"
              className="h-8 w-56 pl-7 text-sm"
            />
          </div>
          <Input
            value={draftFilters.organization_type}
            onChange={(event) =>
              setDraftFilters((current) => ({ ...current, organization_type: event.target.value }))
            }
            placeholder="组织类型"
            className="h-8 w-32 text-sm"
          />
          <Input
            value={draftFilters.affiliation}
            onChange={(event) => setDraftFilters((current) => ({ ...current, affiliation: event.target.value }))}
            placeholder="组织所属"
            className="h-8 w-32 text-sm"
          />
          <Input
            value={draftFilters.campus}
            onChange={(event) => setDraftFilters((current) => ({ ...current, campus: event.target.value }))}
            placeholder="校区"
            className="h-8 w-28 text-sm"
          />
          <Button type="submit" size="sm" variant="outline" className="h-8 text-sm">
            查询
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-8 text-sm" onClick={handleResetFilters}>
            重置
          </Button>
        </form>

        <CreateOrganizationDialog />
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryCard
          icon={Building2}
          label="当前页组织"
          value={String(data?.data.length ?? 0)}
          color="text-sky-600"
        />
        <SummaryCard icon={Users} label="总组织数" value={String(total)} color="text-emerald-600" />
        <SummaryCard
          icon={Shield}
          label="筛选条件"
          value={String(countActiveFilters(filters))}
          color="text-amber-600"
        />
        <SummaryCard
          icon={MapPin}
          label="当前页校区数"
          value={String(new Set((data?.data ?? []).map((item) => item.campus).filter(Boolean)).size)}
          color="text-rose-600"
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border">
        {isLoading ? (
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <p className="text-sm text-muted-foreground">加载中...</p>
          </div>
        ) : (
          <div className="admin-list-scroll min-h-0 flex-1 overflow-auto">
            <Table>
              <TableBody>
                {data?.data.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-muted-foreground">#{item.id}</TableCell>
                    <TableCell className="max-w-48">
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate font-medium">{item.name}</span>
                        <span className="truncate text-xs text-muted-foreground">{item.introduction || "暂无介绍"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.organization_type || "未填写"}</Badge>
                    </TableCell>
                    <TableCell className="max-w-36 truncate">{item.affiliation || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.campus || "未填写"}</Badge>
                    </TableCell>
                    <TableCell className="max-w-36 truncate">{item.contact || "-"}</TableCell>
                    <TableCell className="text-muted-foreground hidden md:table-cell">
                      {formatDateTime(item.created_at, "date")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <OrganizationDetailDialog item={item} />
                        <EditOrganizationDialog item={item} />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              title="删除"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>确认删除组织</AlertDialogTitle>
                              <AlertDialogDescription>
                                确定要删除“{item.name}”吗？此操作不可撤销。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>取消</AlertDialogCancel>
                              <AlertDialogAction
                                variant="destructive"
                                onClick={() => deleteMut.mutate(item.id)}
                                disabled={deleteMut.isPending}
                              >
                                删除
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!data?.data || data.data.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                      暂无组织数据
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-xs text-muted-foreground">
          共 {total} 条 · 第 {page}/{totalPages} 页
        </p>
        <div className="flex flex-wrap items-center gap-1">
          <Button size="sm" variant="outline" className="h-8 px-2 text-sm" disabled={page <= 1} onClick={() => setPage(1)}>
            首页
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2 text-sm"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
          >
            上一页
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2 text-sm"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => current + 1)}
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
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-lg border px-3 py-2.5">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className={`h-3.5 w-3.5 ${color}`} />
        {label}
      </div>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function CreateOrganizationDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<OrganizationFormValues>(EMPTY_FORM);

  const createMut = useMutation({
    mutationFn: (payload: OrganizationPayload) => createOrganization(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      setOpen(false);
      setForm(EMPTY_FORM);
      toast.success("组织已创建");
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSubmit = () => {
    const payload = buildCreatePayload(form);
    if (!payload.name) {
      toast.error("请输入组织名称");
      return;
    }
    createMut.mutate(payload);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setForm(EMPTY_FORM);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 gap-1 text-sm">
          <Plus className="h-3.5 w-3.5" />
          新建组织
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>新建组织</DialogTitle>
          <DialogDescription>创建后可继续在列表中查看详情或编辑。</DialogDescription>
        </DialogHeader>
        <OrganizationFormFields form={form} onChange={setForm} />
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={createMut.isPending}>
            创建
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditOrganizationDialog({ item }: { item: Organization }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<OrganizationFormValues>(() => mapOrganizationToForm(item));

  useEffect(() => {
    if (open) {
      setForm(mapOrganizationToForm(item));
    }
  }, [item, open]);

  const updateMut = useMutation({
    mutationFn: (payload: Partial<OrganizationPayload>) => updateOrganization(item.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["organization-detail", item.id] });
      setOpen(false);
      toast.success("组织已更新");
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSubmit = () => {
    const payload = buildUpdatePayload(item, form);
    if ("error" in payload) {
      toast.error(payload.error);
      return;
    }
    if (Object.keys(payload).length === 0) {
      toast.error("请至少修改一个字段");
      return;
    }
    updateMut.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-7 w-7" title="编辑">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>编辑组织</DialogTitle>
          <DialogDescription>仅会提交有变化的字段，避免空字符串更新。</DialogDescription>
        </DialogHeader>
        <OrganizationFormFields form={form} onChange={setForm} />
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={updateMut.isPending}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OrganizationDetailDialog({ item }: { item: Organization }) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["organization-detail", item.id],
    queryFn: () => getOrganization(item.id),
    enabled: open,
  });

  const detail = data ?? item;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-7 w-7" title="详情">
          <Eye className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{detail.name}</DialogTitle>
          <DialogDescription>组织详情信息</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <p className="py-6 text-sm text-muted-foreground">加载中...</p>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <DetailField icon={Building2} label="组织名称" value={detail.name} />
              <DetailField icon={Users} label="组织类型" value={detail.organization_type || "-"} />
              <DetailField icon={Shield} label="组织所属" value={detail.affiliation || "-"} />
              <DetailField icon={MapPin} label="校区" value={detail.campus || "-"} />
              <DetailField icon={Phone} label="联系方式" value={detail.contact || "-"} />
              <DetailField icon={Eye} label="创建时间" value={formatDateTime(detail.created_at)} />
            </div>
            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-sm font-medium">组织介绍</p>
              <p className="whitespace-pre-wrap wrap-break-word text-sm text-muted-foreground">
                {detail.introduction || "暂无介绍"}
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function OrganizationFormFields({
  form,
  onChange,
}: {
  form: OrganizationFormValues;
  onChange: React.Dispatch<React.SetStateAction<OrganizationFormValues>>;
}) {
  return (
    <div className="grid gap-4 py-1">
      <div className="grid gap-4 md:grid-cols-2">
        <FormItem label="组织名称" value={form.name} onChange={(value) => onChange((current) => ({ ...current, name: value }))} />
        <FormItem
          label="组织类型"
          value={form.organization_type}
          onChange={(value) => onChange((current) => ({ ...current, organization_type: value }))}
        />
        <FormItem
          label="组织所属"
          value={form.affiliation}
          onChange={(value) => onChange((current) => ({ ...current, affiliation: value }))}
        />
        <FormItem label="校区" value={form.campus} onChange={(value) => onChange((current) => ({ ...current, campus: value }))} />
        <FormItem
          label="联系方式"
          value={form.contact}
          onChange={(value) => onChange((current) => ({ ...current, contact: value }))}
          className="md:col-span-2"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="organization-introduction">组织介绍</Label>
        <Textarea
          id="organization-introduction"
          value={form.introduction}
          onChange={(event) => onChange((current) => ({ ...current, introduction: event.target.value }))}
          placeholder="请输入组织介绍"
          className="min-h-28"
        />
      </div>
    </div>
  );
}

function FormItem({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className ?? ""}`.trim()}>
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function DetailField({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border px-3 py-2.5">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="wrap-break-word text-sm font-medium">{value}</p>
    </div>
  );
}

function normalizeFilters(filters: FilterState): FilterState {
  return {
    query: filters.query.trim(),
    organization_type: filters.organization_type.trim(),
    affiliation: filters.affiliation.trim(),
    campus: filters.campus.trim(),
  };
}

function countActiveFilters(filters: FilterState) {
  return Object.values(filters).filter(Boolean).length;
}

function mapOrganizationToForm(item: Organization): OrganizationFormValues {
  return {
    name: item.name || "",
    organization_type: item.organization_type || "",
    affiliation: item.affiliation || "",
    campus: item.campus || "",
    introduction: item.introduction || "",
    contact: item.contact || "",
  };
}

function buildCreatePayload(form: OrganizationFormValues): OrganizationPayload {
  const normalized = normalizeForm(form);

  return {
    name: normalized.name,
    ...(normalized.organization_type ? { organization_type: normalized.organization_type } : {}),
    ...(normalized.affiliation ? { affiliation: normalized.affiliation } : {}),
    ...(normalized.campus ? { campus: normalized.campus } : {}),
    ...(normalized.introduction ? { introduction: normalized.introduction } : {}),
    ...(normalized.contact ? { contact: normalized.contact } : {}),
  };
}

function buildUpdatePayload(item: Organization, form: OrganizationFormValues) {
  const normalized = normalizeForm(form);
  const original = normalizeForm(mapOrganizationToForm(item));
  const payload: Partial<OrganizationPayload> = {};

  for (const key of Object.keys(normalized) as Array<keyof OrganizationFormValues>) {
    if (normalized[key] === original[key]) {
      continue;
    }

    if (!normalized[key]) {
      return { error: `${FIELD_LABELS[key]}不能为空` };
    }

    payload[key] = normalized[key];
  }

  return payload;
}

function normalizeForm(form: OrganizationFormValues): OrganizationFormValues {
  return {
    name: form.name.trim(),
    organization_type: form.organization_type.trim(),
    affiliation: form.affiliation.trim(),
    campus: form.campus.trim(),
    introduction: form.introduction.trim(),
    contact: form.contact.trim(),
  };
}

function formatDateTime(value?: string, mode: "date" | "datetime" = "datetime") {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return mode === "date" ? date.toLocaleDateString() : date.toLocaleString();
}