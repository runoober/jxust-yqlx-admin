import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMaterialCategories, listMaterials, searchMaterials, getMaterialDetail, getTopMaterials, getHotWords, updateMaterialDesc, deleteMaterial } from "@/api/materials";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Folder, FileText, ChevronRight, Home, Search, Pencil, Trash2, Download, Flame, ArrowLeft, Eye, Star, ExternalLink, Tag, TrendingUp, Hash } from "lucide-react";
import { toast } from "sonner";
import type { MaterialListItem, MaterialCategory } from "@/types/api";

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function getHotnessValue(material: MaterialListItem, type: 0 | 7) {
  return type === 7 ? material.period_hotness : material.total_hotness;
}

interface BreadcrumbItem {
  id: number | null;
  name: string;
}

export default function MaterialsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"browse" | "hot">("browse");
  const [path, setPath] = useState<BreadcrumbItem[]>([{ id: 1, name: "资料库" }]);
  const [page, setPage] = useState(1);
  const [searchMode, setSearchMode] = useState(false);
  const [keywords, setKeywords] = useState("");
  const [searchKeywords, setSearchKeywords] = useState("");
  const [searchPage, setSearchPage] = useState(1);

  const currentId = path[path.length - 1].id;

  const { data: categories, isLoading: catLoading } = useQuery({
    queryKey: ["material-categories", currentId],
    queryFn: () => getMaterialCategories(currentId ?? undefined),
    enabled: !searchMode,
  });

  const { data: materialsData, isLoading: matLoading } = useQuery({
    queryKey: ["materials-list", currentId, page],
    queryFn: () => listMaterials({ category_id: currentId ?? undefined, page, page_size: 20 }),
    enabled: !searchMode,
  });

  const { data: searchData, isLoading: searchLoading } = useQuery({
    queryKey: ["materials-search", searchKeywords, searchPage],
    queryFn: () => searchMaterials({ keywords: searchKeywords, page: searchPage, page_size: 20 }),
    enabled: searchMode && !!searchKeywords,
  });

  const { data: hotListAll, isLoading: hotAllLoading } = useQuery({
    queryKey: ["materials-hot", 0],
    queryFn: () => getTopMaterials({ limit: 20, type: 0 }),
    enabled: tab === "hot",
  });

  const { data: hotListWeek, isLoading: hotWeekLoading } = useQuery({
    queryKey: ["materials-hot", 7],
    queryFn: () => getTopMaterials({ limit: 20, type: 7 }),
    enabled: tab === "hot",
  });

  const { data: hotWords, isLoading: hotWordsLoading } = useQuery({
    queryKey: ["materials-hotwords"],
    queryFn: () => getHotWords(20),
    enabled: tab === "hot",
  });

  const navigateTo = (index: number) => {
    setPath(path.slice(0, index + 1));
    setPage(1);
  };

  const openFolder = (cat: MaterialCategory) => {
    setPath([...path, { id: cat.id, name: cat.name }]);
    setPage(1);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keywords.trim()) { setSearchMode(false); return; }
    setSearchMode(true);
    setSearchKeywords(keywords.trim());
    setSearchPage(1);
  };

  const exitSearch = () => {
    setSearchMode(false);
    setKeywords("");
    setSearchKeywords("");
  };

  const deleteMut = useMutation({
    mutationFn: deleteMaterial,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["materials"] }); qc.invalidateQueries({ queryKey: ["materials-list"] }); qc.invalidateQueries({ queryKey: ["materials-search"] }); toast.success("已删除"); },
    onError: (e) => toast.error(e.message),
  });

  const isLoading = searchMode ? searchLoading : (catLoading || matLoading);
  const files = searchMode ? (searchData?.materials ?? []) : (materialsData?.data ?? []);
  const total = searchMode ? (searchData?.total ?? 0) : (materialsData?.total ?? 0);
  const curPage = searchMode ? searchPage : page;
  const setCurPage = searchMode ? setSearchPage : setPage;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="flex min-h-0 w-full flex-col gap-4 overflow-hidden">
      <div className="flex shrink-0 items-center gap-2">
          <div className="flex items-center border rounded-lg overflow-hidden h-8 text-sm shrink-0 ">
            <button onClick={() => { setTab("browse"); setSearchMode(false); }} className={`px-3 shrink-0 h-full transition-colors ${tab === "browse" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>浏览</button>
            <button onClick={() => setTab("hot")} className={`px-3 h-full flex items-center shrink-0 gap-1 transition-colors ${tab === "hot" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}><Flame className="h-3.5 w-3.5" />热门</button>
          </div>
          {tab === "browse" && (
            <form onSubmit={handleSearch} className="m-0.5 flex items-center gap-3 py-1">
              <Input placeholder="搜索文件..." value={keywords} onChange={(e) => setKeywords(e.target.value)} className="max-w-50 h-8 text-sm" />
              <Button type="submit" size="sm" variant="outline" className="h-8">
                <Search className="h-4 w-4" />
              </Button>
            </form>
          )}
      </div>

      {/* Tab: Browse */}
      {tab === "browse" && (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
          {/* Breadcrumb */}
          {searchMode ? (
            <div className="flex shrink-0 items-center gap-2 text-sm">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={exitSearch}>
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />返回
              </Button>
              <span className="text-muted-foreground">搜索「{searchKeywords}」共 {total} 条结果</span>
            </div>
          ) : (
            <nav className="flex shrink-0 flex-wrap items-center gap-0.5 text-sm">
              {path.map((item, i) => (
                <span key={i} className="flex items-center gap-0.5">
                  {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                  <button
                    onClick={() => navigateTo(i)}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-muted transition-colors ${i === path.length - 1 ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {i === 0 && <Home className="h-3.5 w-3.5" />}
                    {item.name}
                  </button>
                </span>
              ))}
            </nav>
          )}

          {/* Content list */}
          {isLoading ? (
            <div className="flex min-h-0 flex-1 items-center justify-center">
              <p className="text-sm text-muted-foreground">加载中...</p>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
              <div className="min-h-0 flex-1 overflow-y-auto border rounded-lg divide-y">
                {/* Folders */}
                {!searchMode && categories?.map((cat) => (
                  <button
                    key={`cat-${cat.id}`}
                    onClick={() => openFolder(cat)}
                    className="flex items-center gap-3 w-full px-3 py-2 hover:bg-muted transition-colors text-left"
                  >
                    <Folder className="h-4 w-4 text-amber-500 shrink-0" />
                    <span className="text-sm font-medium truncate flex-1">{cat.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{cat.material_count} 项</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                ))}

                {/* Files */}
                {files.map((m) => (
                  <FileRow key={m.md5} material={m} onDelete={() => deleteMut.mutate(m.md5)} />
                ))}

                {/* Empty */}
                {!searchMode && (!categories || categories.length === 0) && files.length === 0 && (
                  <p className="text-sm text-muted-foreground py-6 text-center">此目录为空</p>
                )}
              </div>

              {/* Pagination */}
              {total > 20 && (
                <div className="flex shrink-0 items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">{total} 个文件 · 第 {curPage}/{totalPages} 页</p>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" className="h-8 text-sm px-2" disabled={curPage <= 1} onClick={() => setCurPage(1)}>首页</Button>
                    <Button size="sm" variant="outline" className="h-8 text-sm px-2" disabled={curPage <= 1} onClick={() => setCurPage(curPage - 1)}>上一页</Button>
                    <Button size="sm" variant="outline" className="h-8 text-sm px-2" disabled={curPage >= totalPages} onClick={() => setCurPage(curPage + 1)}>下一页</Button>
                    <Button size="sm" variant="outline" className="h-8 text-sm px-2" disabled={curPage >= totalPages} onClick={() => setCurPage(totalPages)}>末页</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab: Hot */}
      {tab === "hot" && (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* 总榜 */}
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><TrendingUp className="h-4 w-4 text-orange-500" />总榜</h3>
            {hotAllLoading ? <p className="text-xs text-muted-foreground">加载中...</p> : (
              <div className="border rounded-lg divide-y">
                {hotListAll?.map((m, i) => (
                  <div key={m.md5} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-muted/50 transition-colors">
                    <span className={`text-xs font-bold w-5 text-center shrink-0 ${i < 3 ? "text-orange-500" : "text-muted-foreground"}`}>{i + 1}</span>
                    <span className="text-sm truncate flex-1 min-w-0">{m.file_name}</span>
                    <span className="text-xs text-orange-500 font-medium shrink-0 flex items-center gap-0.5"><Flame className="h-3 w-3" />{getHotnessValue(m, 0)}</span>
                  </div>
                ))}
                {(!hotListAll || hotListAll.length === 0) && <p className="text-xs text-muted-foreground py-4 text-center">暂无数据</p>}
              </div>
            )}
          </div>
          {/* 周榜 */}
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><TrendingUp className="h-4 w-4 text-blue-500" />周榜</h3>
            {hotWeekLoading ? <p className="text-xs text-muted-foreground">加载中...</p> : (
              <div className="border rounded-lg divide-y">
                {hotListWeek?.map((m, i) => (
                  <div key={m.md5} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-muted/50 transition-colors">
                    <span className={`text-xs font-bold w-5 text-center shrink-0 ${i < 3 ? "text-blue-500" : "text-muted-foreground"}`}>{i + 1}</span>
                    <span className="text-sm truncate flex-1 min-w-0">{m.file_name}</span>
                    <span className="text-xs text-blue-500 font-medium shrink-0 flex items-center gap-0.5"><Flame className="h-3 w-3" />{getHotnessValue(m, 7)}</span>
                  </div>
                ))}
                {(!hotListWeek || hotListWeek.length === 0) && <p className="text-xs text-muted-foreground py-4 text-center">暂无数据</p>}
              </div>
            )}
          </div>
          {/* 热词 */}
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Hash className="h-4 w-4 text-violet-500" />热搜词</h3>
            {hotWordsLoading ? <p className="text-xs text-muted-foreground">加载中...</p> : (
              <div className="border rounded-lg divide-y">
                {hotWords?.map((w, i) => (
                  <div key={w.keywords} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-muted/50 transition-colors">
                    <span className={`text-xs font-bold w-5 text-center shrink-0 ${i < 3 ? "text-violet-500" : "text-muted-foreground"}`}>{i + 1}</span>
                    <span className="text-sm truncate flex-1 min-w-0">{w.keywords}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{w.count} 次</span>
                  </div>
                ))}
                {(!hotWords || hotWords.length === 0) && <p className="text-xs text-muted-foreground py-4 text-center">暂无数据</p>}
              </div>
            )}
          </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FileRow({ material: m, onDelete }: { material: MaterialListItem; onDelete: () => void }) {
  const parts = m.file_name.split(".");
  const ext = parts.length > 1 ? parts.pop()?.toLowerCase() ?? "" : "";
  const [viewOpen, setViewOpen] = useState(false);

  return (
    <div className="px-3 py-2 hover:bg-muted/50 transition-colors group cursor-default" onDoubleClick={() => setViewOpen(true)}>
      <div className="flex items-start gap-3">
        <FileText className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
              <span className="text-sm truncate min-w-0">{m.file_name}</span>
              <div className="hidden md:flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
                {ext && <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 shrink-0">{ext}</Badge>}
                <span>{formatSize(m.file_size)}</span>
                <span className="flex items-center gap-0.5"><Download className="h-3 w-3" />{m.download_count}</span>
                <span className="flex items-center gap-0.5"><Flame className="h-3 w-3" />{m.total_hotness}</span>
              </div>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setViewOpen(true)}>
                <Eye className="h-3.5 w-3.5" />
              </Button>
              <EditMaterialDialog material={m} />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>确认删除</AlertDialogTitle>
                    <AlertDialogDescription>确定要删除「{m.file_name}」吗？此操作不可撤销。</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={onDelete}>删除</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground md:hidden">
            {ext && <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">{ext}</Badge>}
            <span>{formatSize(m.file_size)}</span>
            <span className="flex items-center gap-0.5"><Download className="h-3 w-3" />{m.download_count}</span>
            <span className="flex items-center gap-0.5"><Flame className="h-3 w-3" />{m.total_hotness}</span>
          </div>
        </div>
      </div>
      <ViewMaterialDialog md5={m.md5} open={viewOpen} onOpenChange={setViewOpen} />
    </div>
  );
}
function ViewMaterialDialog({ md5, open, onOpenChange }: { md5: string; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["material-detail", md5],
    queryFn: () => getMaterialDetail(md5),
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>资料详情</DialogTitle></DialogHeader>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4">加载中...</p>
        ) : data ? (
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <FileText className="h-8 w-8 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium break-all">{data.file_name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{data.category_path}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 border rounded-lg p-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">大小</span>
                <span>{formatSize(data.file_size)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">MD5</span>
                <span className="max-w-30 truncate font-mono text-xs">{data.md5}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1"><Download className="h-3 w-3" />下载</span>
                <span>{data.download_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1"><Eye className="h-3 w-3" />浏览</span>
                <span>{data.view_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1"><Flame className="h-3 w-3" />热度</span>
                <span>{data.total_hotness}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1"><Star className="h-3 w-3" />评分</span>
                <span>{data.rating > 0 ? `${data.rating.toFixed(1)} (${data.rating_count})` : "暂无"}</span>
              </div>
            </div>
            {data.description && (
              <div>
                <p className="text-muted-foreground text-xs mb-1">描述</p>
                <p className="whitespace-pre-line">{data.description}</p>
              </div>
            )}
            {data.tags && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                {data.tags.split(",").map((t) => (
                  <Badge key={t} variant="secondary" className="text-xs">{t.trim()}</Badge>
                ))}
              </div>
            )}
            {data.external_link && (
              <a href={data.external_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-500 hover:underline">
                <ExternalLink className="h-3 w-3" />{data.external_link}
              </a>
            )}
            {data.is_recommended && <Badge>推荐资料</Badge>}
            <p className="text-xs text-muted-foreground">上传时间：{new Date(data.created_at).toLocaleString()}</p>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function EditMaterialDialog({ material: m }: { material: MaterialListItem }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{
    description: string;
    tags: string;
    isRecommended: boolean;
    externalLink: string;
  } | null>(null);
  const qc = useQueryClient();
  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["material-detail", m.md5, "edit"],
    queryFn: () => getMaterialDetail(m.md5),
    enabled: open,
  });

  const formValues = draft ?? {
    description: detail?.description ?? "",
    tags: detail?.tags ?? m.tags ?? "",
    isRecommended: Boolean(detail?.is_recommended),
    externalLink: detail?.external_link ?? "",
  };

  const mut = useMutation({
    mutationFn: () => updateMaterialDesc(m.md5, { description: formValues.description, tags: formValues.tags, is_recommended: formValues.isRecommended, external_link: formValues.externalLink }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["materials"] }); qc.invalidateQueries({ queryKey: ["materials-list"] }); qc.invalidateQueries({ queryKey: ["materials-search"] }); qc.invalidateQueries({ queryKey: ["material-detail", m.md5] }); qc.invalidateQueries({ queryKey: ["material-detail", m.md5, "edit"] }); setDraft(null); setOpen(false); toast.success("已更新"); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setDraft(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-6 w-6">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>编辑资料描述</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{m.file_name}</p>
          <div className="space-y-1"><Label>描述</Label><Textarea value={formValues.description} onChange={(e) => setDraft({ ...formValues, description: e.target.value })} disabled={detailLoading || mut.isPending} rows={5} /></div>
          <div className="space-y-1"><Label>标签 (逗号分隔)</Label><Input value={formValues.tags} onChange={(e) => setDraft({ ...formValues, tags: e.target.value })} disabled={detailLoading || mut.isPending} /></div>
          <div className="flex items-center gap-2">
            <Label>推荐</Label>
            <Switch checked={formValues.isRecommended} onCheckedChange={(checked) => setDraft({ ...formValues, isRecommended: checked })} disabled={detailLoading || mut.isPending} />
          </div>
          <div className="space-y-1"><Label>外部链接</Label><Input value={formValues.externalLink} onChange={(e) => setDraft({ ...formValues, externalLink: e.target.value })} disabled={detailLoading || mut.isPending} /></div>
        </div>
        <DialogFooter><Button onClick={() => mut.mutate()} disabled={detailLoading || mut.isPending}>保存</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
