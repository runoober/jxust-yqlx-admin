import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  Braces,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Download,
  Edit2,
  History,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  User,
  Wrench,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  createConversation,
  deleteConversation,
  exportConversation,
  getConversationMessages,
  listConversations,
  streamChat,
  updateConversationTitle,
  type ChatStreamEvent,
} from "@/api/chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import type { ChatConversation, ChatMessage } from "@/types/api";
import { cn } from "@/lib/utils";

type UiMessage = ChatMessage & {
  id: string;
  streaming?: boolean;
  streamToolKey?: string;
  streamToolIndex?: number;
  streamParentId?: string;
  streamToolName?: string;
};

const PAGE_SIZE = 30;

export default function AgentPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [checkpointId, setCheckpointId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const conversationsQuery = useQuery({
    queryKey: ["chat-conversations", page],
    queryFn: () => listConversations({ page, page_size: PAGE_SIZE }),
  });

  const conversations = conversationsQuery.data?.conversations ?? [];
  const selectedConversation = useMemo(
    () => conversations.find((item) => item.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  const messagesQuery = useQuery({
    queryKey: ["chat-messages", selectedId],
    queryFn: () => getConversationMessages(selectedId!),
    enabled: !!selectedId,
  });

  useEffect(() => {
    if (!selectedId && conversations.length > 0) {
      setSelectedId(conversations[0].id);
    }
  }, [conversations, selectedId]);

  useEffect(() => {
    if (messagesQuery.data) {
      setMessages(messagesQuery.data.map(toUiMessage));
      setCheckpointId(null);
    }
  }, [messagesQuery.data]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, isStreaming]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const createMut = useMutation({
    mutationFn: createConversation,
    onSuccess: (conversation) => {
      qc.invalidateQueries({ queryKey: ["chat-conversations"] });
      setSelectedId(conversation.id);
      setMessages([]);
      toast.success("对话已创建");
    },
    onError: (error) => toast.error(error.message),
  });

  const updateTitleMut = useMutation({
    mutationFn: ({ id, title }: { id: number; title: string }) => updateConversationTitle(id, title),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat-conversations"] });
      setEditingId(null);
      toast.success("标题已更新");
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMut = useMutation({
    mutationFn: deleteConversation,
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["chat-conversations"] });
      qc.removeQueries({ queryKey: ["chat-messages", id] });
      if (selectedId === id) {
        const next = conversations.find((item) => item.id !== id);
        setSelectedId(next?.id ?? null);
        setMessages([]);
      }
      toast.success("对话已删除");
    },
    onError: (error) => toast.error(error.message),
  });

  const total = conversationsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleCreate = (title: string) => {
    const finalTitle = title.trim() || "新的对话";
    createMut.mutate(finalTitle);
  };

  const handleSelect = (id: number) => {
    if (isStreaming) {
      toast.warning("当前回复生成中，请稍后切换");
      return;
    }
    setSelectedId(id);
  };

  const handleSaveTitle = () => {
    if (!editingId) {
      return;
    }
    const title = editingTitle.trim();
    if (!title) {
      toast.error("标题不能为空");
      return;
    }
    updateTitleMut.mutate({ id: editingId, title });
  };

  const handleExport = async (conversation: ChatConversation) => {
    try {
      const data = await exportConversation(conversation.id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `conversation-${conversation.id}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "导出失败");
    }
  };

  const ensureConversation = async (content: string) => {
    if (selectedId) {
      return selectedId;
    }
    const title = content.trim().slice(0, 24) || "新的对话";
    const conversation = await createConversation(title);
    setSelectedId(conversation.id);
    qc.invalidateQueries({ queryKey: ["chat-conversations"] });
    return conversation.id;
  };

  const handleSend = async () => {
    const content = input.trim();
    if (!content || isStreaming) {
      return;
    }

    setInput("");
    setIsStreaming(true);
    setCheckpointId(null);
    const controller = new AbortController();
    abortRef.current = controller;
    const userMessage: UiMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    };
    const assistantId = crypto.randomUUID();
    const pendingAssistantMessage: UiMessage = {
      id: `${assistantId}:reasoning:0`,
      role: "reasoning",
      content: "",
      streaming: true,
      streamParentId: assistantId,
    };

    setMessages((prev) => [...prev, userMessage, pendingAssistantMessage]);

    try {
      const conversationId = await ensureConversation(content);

      await streamChat({
        conversationId,
        message: { role: "user", content },
        signal: controller.signal,
        onEvent: (event) => applyStreamEvent(event, assistantId, setMessages, setCheckpointId),
      });

      setMessages((prev) =>
        prev.map((item) => (item.streamParentId === assistantId ? { ...item, streaming: false } : item)),
      );
      qc.invalidateQueries({ queryKey: ["chat-conversations"] });
    } catch (error) {
      if ((error as DOMException).name !== "AbortError") {
        toast.error(error instanceof Error ? error.message : "发送失败");
      }
      setMessages((prev) => prev.filter((item) => !item.streaming));
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
  };

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-3 overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-background">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold">Agent 学习助手</h2>
            <p className="truncate text-xs text-muted-foreground">基于知识库与内置工具的学习助手</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            size="icon-sm"
            variant="outline"
            className="lg:hidden"
            title={historyOpen ? "收起历史对话" : "展开历史对话"}
            onClick={() => setHistoryOpen((open) => !open)}
          >
            {historyOpen ? <ChevronUp className="h-4 w-4" /> : <History className="h-4 w-4" />}
          </Button>
          <NewConversationDialog onCreate={handleCreate} pending={createMut.isPending} />
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden lg:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className={cn("min-h-52 min-w-0 flex-col overflow-hidden rounded-lg border lg:flex", historyOpen ? "flex" : "hidden")}>
          <div className="flex h-10 shrink-0 items-center justify-between border-b px-3">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              历史对话
            </div>
            <Button
              size="icon-xs"
              variant="ghost"
              title="刷新"
              onClick={() => conversationsQuery.refetch()}
              disabled={conversationsQuery.isFetching}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", conversationsQuery.isFetching && "animate-spin")} />
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto divide-y">
            {conversationsQuery.isLoading ? (
              <p className="py-4 text-center text-xs text-muted-foreground">加载中...</p>
            ) : conversations.length > 0 ? (
              conversations.map((conversation) => (
                <ConversationRow
                  key={conversation.id}
                  conversation={conversation}
                  active={conversation.id === selectedId}
                  disabled={isStreaming}
                  onSelect={() => handleSelect(conversation.id)}
                  onEdit={() => {
                    setEditingId(conversation.id);
                    setEditingTitle(conversation.title);
                  }}
                  onDelete={() => deleteMut.mutate(conversation.id)}
                  onExport={() => handleExport(conversation)}
                />
              ))
            ) : (
              <div className="flex h-full min-h-32 flex-col items-center justify-center gap-2 p-4 text-center">
                <Bot className="h-8 w-8 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">暂无对话，创建后开始提问</p>
              </div>
            )}
          </div>

          {total > PAGE_SIZE && (
            <div className="flex shrink-0 items-center justify-between border-t px-2 py-2">
              <span className="text-xs text-muted-foreground">
                {page}/{totalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button size="xs" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  上一页
                </Button>
                <Button size="xs" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  下一页
                </Button>
              </div>
            </div>
          )}
        </aside>

        <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border">
          <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b px-3">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-medium">
                {selectedConversation?.title ?? (selectedId ? `对话 #${selectedId}` : "未选择对话")}
              </h3>
            </div>
            {selectedConversation?.last_message_at && (
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatTime(selectedConversation.last_message_at)}
              </span>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-muted/20 px-3 py-3">
            {messagesQuery.isLoading && selectedId ? (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                加载消息...
              </div>
            ) : messages.length > 0 ? (
              <div className="mx-auto flex max-w-4xl flex-col gap-3">
                <ConversationTimeline messages={messages} />
                <div ref={endRef} />
              </div>
            ) : (
              <div className="flex h-full min-h-72 flex-col items-center justify-center gap-2 text-center">
                <Bot className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm font-medium">开始一段 Agent 对话</p>
                <p className="max-w-sm text-xs text-muted-foreground">
                  可以询问学习计划、资料检索、课程问题或让 Agent 调用后端工具完成查询。
                </p>
              </div>
            )}
          </div>

          {checkpointId && (
            <div className="shrink-0 border-t bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
              工具调用等待补充输入：{checkpointId}
            </div>
          )}

          <div className="shrink-0 border-t bg-background p-3">
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="输入消息，Enter 发送，Shift + Enter 换行"
                className="max-h-40 min-h-20 flex-1 resize-none text-sm"
                disabled={isStreaming}
              />
              {isStreaming ? (
                <Button variant="outline" className="h-10 w-10 px-0" title="停止" onClick={handleStop}>
                  <X className="h-4 w-4" />
                </Button>
              ) : (
                <Button className="h-10 w-10 px-0" title="发送" onClick={handleSend} disabled={!input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </section>
      </div>

      <Dialog open={editingId !== null} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑对话标题</DialogTitle>
          </DialogHeader>
          <Input
            value={editingTitle}
            onChange={(event) => setEditingTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleSaveTitle();
              }
            }}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingId(null)}>
              取消
            </Button>
            <Button onClick={handleSaveTitle} disabled={updateTitleMut.isPending}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ConversationRow({
  conversation,
  active,
  disabled,
  onSelect,
  onEdit,
  onDelete,
  onExport,
}: {
  conversation: ChatConversation;
  active: boolean;
  disabled: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onExport: () => void;
}) {
  return (
    <div className={cn("group flex items-center gap-2 px-2.5 py-2 transition-colors", active ? "bg-muted" : "hover:bg-muted/50")}>
      <button
        type="button"
        className="min-w-0 flex-1 text-left disabled:cursor-not-allowed disabled:opacity-70"
        onClick={onSelect}
        disabled={disabled}
      >
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium">{conversation.title || `对话 #${conversation.id}`}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span>#{conversation.id}</span>
          <span>{formatTime(conversation.last_message_at || conversation.updated_at)}</span>
        </div>
      </button>
      <div className="flex shrink-0 items-center gap-0.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100">
        <Button size="icon-xs" variant="ghost" title="编辑标题" onClick={onEdit}>
          <Edit2 className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon-xs" variant="ghost" title="导出" onClick={onExport}>
          <Download className="h-3.5 w-3.5" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="icon-xs" variant="ghost" className="text-destructive hover:text-destructive" title="删除">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除</AlertDialogTitle>
              <AlertDialogDescription>确定要删除「{conversation.title}」吗？此操作不可撤销。</AlertDialogDescription>
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

function NewConversationDialog({ onCreate, pending }: { onCreate: (title: string) => void; pending: boolean }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");

  const submit = () => {
    onCreate(title);
    setTitle("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8">
          <Plus className="h-3.5 w-3.5" />
          新建对话
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新建对话</DialogTitle>
        </DialogHeader>
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              submit();
            }
          }}
          placeholder="例如：学习 Go 语言"
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button onClick={submit} disabled={pending}>
            创建
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConversationTimeline({ messages }: { messages: UiMessage[] }) {
  const groups = groupMessages(messages);

  return (
    <>
      {groups.map((group) =>
        group.user ? (
          <ConversationTurn key={group.id} user={group.user} agentMessages={group.agentMessages} />
        ) : (
          group.agentMessages.map((message) => <MessageBubble key={message.id} message={message} />)
        ),
      )}
    </>
  );
}

function ConversationTurn({ user, agentMessages }: { user: UiMessage; agentMessages: UiMessage[] }) {
  return (
    <div className="space-y-3">
      <MessageBubble message={user} />
      {agentMessages.length > 0 && <AgentRun messages={agentMessages} />}
    </div>
  );
}

function AgentRun({ messages }: { messages: UiMessage[] }) {
  const isStreaming = messages.some((message) => message.streaming);

  return (
    <div className="flex gap-2">
      <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border bg-background">
        <Bot className="h-3.5 w-3.5 text-primary" />
      </div>
      <div className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 shadow-xs">
        {isStreaming && (
          <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            正在生成
          </div>
        )}
        <div className="space-y-2">
          {messages.map((message) => renderAgentStep(message))}
          {messages.length === 0 && (
            <div className="text-xs text-muted-foreground">等待 Agent 响应...</div>
          )}
        </div>
      </div>
    </div>
  );
}

function renderAgentStep(message: UiMessage) {
  if (message.role === "reasoning") {
    return <ReasoningStep key={message.id} message={message} />;
  }

  if (message.role === "tool" || message.role === "tool_call") {
    return <ToolStep key={message.id} message={message} />;
  }

  return <FinalAnswerStep key={message.id} message={message} />;
}

function MessageBubble({ message }: { message: UiMessage }) {
  const isUser = message.role === "user";
  const isTool = message.role === "tool" || message.role === "tool_call";

  if (isTool) {
    return <ToolMessageBubble message={message} />;
  }

  return (
    <div className={cn("flex gap-2", isUser && "justify-end")}>
      {!isUser && (
        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border bg-background">
          {isTool ? <Wrench className="h-3.5 w-3.5 text-amber-500" /> : <Bot className="h-3.5 w-3.5 text-primary" />}
        </div>
      )}
      <div
        className={cn(
          "max-w-[min(42rem,85%)] rounded-lg border px-3 py-2 text-sm shadow-xs",
          isUser ? "bg-primary text-primary-foreground" : "bg-background",
          isTool && "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200",
        )}
      >
        <div className="mb-1 flex items-center gap-1.5 text-[11px] opacity-70">
          {isUser ? <User className="h-3 w-3" /> : isTool ? <Wrench className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
          {roleLabel(message.role)}
          {message.streaming && <Loader2 className="h-3 w-3 animate-spin" />}
        </div>
        {message.reasoning_content && (
          <div className="mb-2 max-h-48 overflow-y-auto rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground whitespace-pre-wrap">
            {message.reasoning_content}
          </div>
        )}
        <div className="whitespace-pre-wrap break-words leading-6">
          {message.content || (message.streaming ? "正在生成..." : "")}
        </div>
        {message.tool_calls && message.tool_calls.length > 0 && (
          <div className="mt-2 space-y-1 text-xs">
            {message.tool_calls.map((tool, index) => (
              <div key={`${tool.id ?? index}`} className="rounded-md bg-muted px-2 py-1">
                {tool.function?.name ?? tool.type ?? "tool"}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReasoningStep({ message }: { message: UiMessage }) {
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = contentRef.current;
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }, [message.content]);

  return (
    <div className="flex gap-1.5 text-xs leading-5 text-muted-foreground">
      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <div ref={contentRef} className="max-h-48 min-w-0 flex-1 overflow-y-auto whitespace-pre-wrap break-words pr-1">
        {message.content || (message.streaming ? "正在思考..." : "")}
      </div>
    </div>
  );
}

function ToolStep({ message }: { message: UiMessage }) {
  return <ToolMessageBubble message={message} compact />;
}

function FinalAnswerStep({ message }: { message: UiMessage }) {
  const content = message.content || (message.streaming ? "正在生成..." : "");

  return (
    <div className="pt-1">
      <MarkdownContent content={content} />
      {message.tool_calls && message.tool_calls.length > 0 && (
        <div className="mt-2 border-t pt-2">
          <div className="flex flex-wrap gap-1">
            {message.tool_calls.map((tool, index) => (
              <span key={`${tool.id ?? index}`} className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                {tool.function?.name ?? tool.type ?? "tool"}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  const blocks = parseAgentMarkdown(content);

  return (
    <div className="space-y-2 break-words text-sm leading-6">
      {blocks.map((block, index) => {
        if (block.type === "code") {
          return (
            <pre key={index} className="overflow-auto rounded-md bg-muted px-3 py-2 text-xs leading-5">
              <code>{block.content}</code>
            </pre>
          );
        }

        if (block.type === "heading") {
          const Heading = `h${block.level}` as "h1" | "h2" | "h3";
          return (
            <Heading key={index} className={cn("font-semibold", block.level === 1 ? "text-base" : "text-sm")}>
              {renderInlineMarkdown(block.content, index)}
            </Heading>
          );
        }

        if (block.type === "quote") {
          return (
            <blockquote key={index} className="border-l-2 pl-3 text-muted-foreground">
              {renderInlineMarkdown(block.content, index)}
            </blockquote>
          );
        }

        if (block.type === "divider") {
          return <hr key={index} className="my-3 border-border" />;
        }

        if (block.type === "list") {
          const List = block.ordered ? "ol" : "ul";
          return (
            <List key={index} className={cn("space-y-1 pl-5", block.ordered ? "list-decimal" : "list-disc")}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInlineMarkdown(item, itemIndex)}</li>
              ))}
            </List>
          );
        }

        if (block.type === "table") {
          return (
            <div key={index} className="overflow-x-auto">
              <table className="w-full min-w-max border-collapse text-left text-xs">
                <thead>
                  <tr>
                    {block.headers.map((header, headerIndex) => (
                      <th key={headerIndex} className="border px-2 py-1 font-medium">
                        {renderInlineMarkdown(header, headerIndex)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {block.headers.map((_, cellIndex) => (
                        <td key={cellIndex} className="border px-2 py-1 align-top">
                          {renderInlineMarkdown(row[cellIndex] ?? "", cellIndex)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        return <p key={index}>{renderInlineMarkdown(block.content, index)}</p>;
      })}
    </div>
  );
}

function ToolMessageBubble({ message, compact = false }: { message: UiMessage; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const display = getToolDisplay(message);
  const hasResult = !!display.body;

  const body = (
    <div className="text-xs leading-5 text-muted-foreground">
      <button
        type="button"
        className="flex w-full items-center gap-1.5 text-left"
        onClick={() => hasResult && setOpen((value) => !value)}
        disabled={!hasResult}
      >
        {hasResult ? (
          open ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          )
        ) : (
          <span className="h-3.5 w-3.5 shrink-0" />
        )}
        <Wrench className="h-3.5 w-3.5 shrink-0" />
        <span className="min-w-0 flex-1 truncate">{display.title}</span>
        {hasResult && <span className="shrink-0 text-[11px] opacity-70">{open ? "收起" : "展开"}</span>}
      </button>
      {open && hasResult && (
        <div className="mt-1 flex gap-1.5">
          <Braces className="mt-1 h-3.5 w-3.5 shrink-0" />
          <pre className="max-h-80 min-w-0 flex-1 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-muted-foreground">
            {display.body}
          </pre>
        </div>
      )}
    </div>
  );

  if (compact) {
    return body;
  }

  return (
    <div className="flex gap-2">
      <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border bg-background">
        <Wrench className="h-3.5 w-3.5 text-amber-500" />
      </div>
      <div className="max-w-[min(42rem,85%)]">{body}</div>
    </div>
  );
}

function applyStreamEvent(
  event: ChatStreamEvent,
  assistantId: string,
  setMessages: React.Dispatch<React.SetStateAction<UiMessage[]>>,
  setCheckpointId: React.Dispatch<React.SetStateAction<string | null>>,
) {
  if (event.type === "content" && event.content) {
    removeEmptyThinkingPlaceholder(setMessages, assistantId);
    appendStreamTextMessage(setMessages, assistantId, "assistant", event.content);
    return;
  }

  if (event.type === "reasoning") {
    const reasoning = event.reasoning_content || event.reasoning || event.content || "";
    if (reasoning) {
      appendStreamTextMessage(setMessages, assistantId, "reasoning", reasoning);
    }
    return;
  }

  if (event.type === "tool_call") {
    const name = getToolCallName(event);
    const toolKey = getToolCallKey(event, assistantId);
    setMessages((prev) => {
      const toolCallId = event.tool_call?.id || event.id;
      const toolIndex = event.tool_call?.index;
      const existingIndex = prev.findIndex(
        (item) =>
          item.role === "tool_call" &&
          (item.streamToolKey === toolKey || (toolIndex !== undefined && item.streamToolIndex === toolIndex)),
      );
      const nextMessage: UiMessage = {
        id: existingIndex >= 0 ? prev[existingIndex].id : crypto.randomUUID(),
        role: "tool_call",
        content: "",
        tool_call_id: toolCallId,
        streamToolKey: toolKey,
        streamToolIndex: toolIndex,
        streamParentId: assistantId,
        streamToolName: name,
      };

      if (existingIndex >= 0) {
        return prev.map((item, index) =>
          index === existingIndex
            ? {
                ...item,
                tool_call_id: item.tool_call_id || toolCallId,
                streamToolKey: item.streamToolKey || toolKey,
                streamToolIndex: item.streamToolIndex ?? toolIndex,
                streamToolName: item.streamToolName || name,
              }
            : item,
        );
      }

      return [...prev, nextMessage];
    });
    return;
  }

  if (event.type === "tool_result" || event.type === "tool" || event.type === "observation") {
    const toolCallId = event.tool_call_id || event.id;
    const name = getToolResultName(event);
    const result = getToolResultPayload(event);
    setMessages((prev) => {
      const existingIndex = findToolMessageIndex(prev, assistantId, toolCallId);
      const toolKey =
        existingIndex >= 0
          ? prev[existingIndex].streamToolKey
          : toolCallId || `${assistantId}:tool-result:${getToolResultIndex(assistantId)}`;
      const nextMessage: UiMessage = {
        id: existingIndex >= 0 ? prev[existingIndex].id : crypto.randomUUID(),
        role: "tool",
        content: formatToolPayload(result),
        tool_call_id: toolCallId,
        streamToolKey: toolKey,
        streamToolIndex: existingIndex >= 0 ? prev[existingIndex].streamToolIndex : undefined,
        streamParentId: assistantId,
        streamToolName: existingIndex >= 0 ? prev[existingIndex].streamToolName || name : name,
      };

      if (existingIndex >= 0) {
        return prev.map((item, index) => (index === existingIndex ? nextMessage : item));
      }

      return [...prev, nextMessage];
    });
    return;
  }

  if (event.type === "end") {
    setMessages((prev) =>
      prev.map((item) => (item.streamParentId === assistantId ? { ...item, streaming: false } : item)),
    );
    clearStreamTextIndex(assistantId);
    clearToolResultIndex(assistantId);
    if (event.checkpoint_id) {
      setCheckpointId(event.checkpoint_id);
    }
  }
}

function removeEmptyThinkingPlaceholder(
  setMessages: React.Dispatch<React.SetStateAction<UiMessage[]>>,
  runId: string,
) {
  setMessages((prev) =>
    prev.filter(
      (item) =>
        !(
          item.id === `${runId}:reasoning:0` &&
          item.role === "reasoning" &&
          item.streamParentId === runId &&
          !item.content.trim()
        ),
    ),
  );
}

const streamTextIndexByRun = new Map<string, number>();
const toolResultIndexByRun = new Map<string, number>();

function getToolResultIndex(runId: string) {
  const index = toolResultIndexByRun.get(runId) ?? 0;
  toolResultIndexByRun.set(runId, index + 1);
  return index;
}

function clearToolResultIndex(runId: string) {
  toolResultIndexByRun.delete(runId);
}

function appendStreamTextMessage(
  setMessages: React.Dispatch<React.SetStateAction<UiMessage[]>>,
  runId: string,
  role: "assistant" | "reasoning",
  content: string,
) {
  setMessages((prev) => {
    const last = prev[prev.length - 1];
    if (last?.streamParentId === runId && last.role === role) {
      return prev.map((item, index) =>
        index === prev.length - 1 ? { ...item, content: item.content + content, streaming: true } : item,
      );
    }

    const index = getStreamTextIndex(runId);
    return [
      ...prev,
      {
        id: `${runId}:${role}:${index}`,
        role,
        content,
        streaming: true,
        streamParentId: runId,
      },
    ];
  });
}

function getStreamTextIndex(runId: string) {
  const index = streamTextIndexByRun.get(runId) ?? 0;
  streamTextIndexByRun.set(runId, index + 1);
  return index;
}

function clearStreamTextIndex(runId: string) {
  streamTextIndexByRun.delete(runId);
}

function getToolCallKey(event: ChatStreamEvent, runId: string) {
  const id = event.tool_call?.id || event.id;
  if (id) {
    return id;
  }

  const index = event.tool_call?.index;
  if (index !== undefined) {
    return `${runId}:tool-call:${index}`;
  }

  return `${runId}:tool-call:${getToolCallName(event)}`;
}

function getToolCallName(event: ChatStreamEvent) {
  if (event.tool_call?.function?.name) {
    return event.tool_call.function.name;
  }

  if (typeof event.function === "object" && event.function?.name) {
    return event.function.name;
  }

  if (typeof event.function === "string" && event.function) {
    return event.function;
  }

  return event.name || "工具调用";
}

function getToolResultName(event: ChatStreamEvent) {
  return event.tool_name || getToolCallName(event);
}

function findToolMessageIndex(messages: UiMessage[], runId: string, toolCallId?: string) {
  if (toolCallId) {
    const matchedIndex = messages.findIndex(
      (message) =>
        message.streamParentId === runId &&
        (message.streamToolKey === toolCallId || message.tool_call_id === toolCallId),
    );
    if (matchedIndex >= 0) {
      return matchedIndex;
    }
  }

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.streamParentId === runId && message.role === "tool_call" && message.streamToolKey) {
      return index;
    }
  }

  return -1;
}

function getToolResultPayload(event: ChatStreamEvent) {
  if (event.result !== undefined) return event.result;
  if (event.output !== undefined) return event.output;
  if (event.data !== undefined) return event.data;
  if (event.observation !== undefined) return event.observation;
  if (event.content !== undefined) return event.content;
  return "";
}

function formatToolPayload(payload: unknown) {
  if (payload === undefined || payload === null) {
    return "";
  }

  if (typeof payload === "string") {
    return payload;
  }

  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
}

function getToolDisplay(message: UiMessage) {
  const content = message.content.trim();
  const title = message.streamToolName || (message.role === "tool_call" ? "工具调用" : "工具结果");

  return {
    title,
    body: content ? formatJsonText(content) : "",
  };
}

function formatJsonText(value: string) {
  if (!value) {
    return "{}";
  }

  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

type MarkdownBlock =
  | { type: "paragraph"; content: string }
  | { type: "heading"; level: 1 | 2 | 3; content: string }
  | { type: "quote"; content: string }
  | { type: "code"; content: string }
  | { type: "divider" }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] };

const parseAgentMarkdown = (content: string): MarkdownBlock[] => {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];
  let listOrdered = false;
  let inCode = false;
  let codeLines: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ type: "paragraph", content: paragraph.join("\n") });
      paragraph = [];
    }
  };

  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push({ type: "list", ordered: listOrdered, items: listItems });
      listItems = [];
    }
  };

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    if (line.trim().startsWith("```")) {
      if (inCode) {
        blocks.push({ type: "code", content: codeLines.join("\n") });
        codeLines = [];
        inCode = false;
      } else {
        flushParagraph();
        flushList();
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    if (/^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
      flushParagraph();
      flushList();
      blocks.push({ type: "divider" });
      continue;
    }

    if (isMarkdownTableStart(lines, lineIndex)) {
      flushParagraph();
      flushList();
      const { headers, rows, nextIndex } = parseMarkdownTable(lines, lineIndex);
      blocks.push({ type: "table", headers, rows });
      lineIndex = nextIndex - 1;
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({
        type: "heading",
        level: heading[1].length as 1 | 2 | 3,
        content: heading[2],
      });
      continue;
    }

    const quote = /^>\s?(.*)$/.exec(line);
    if (quote) {
      flushParagraph();
      flushList();
      blocks.push({ type: "quote", content: quote[1] });
      continue;
    }

    const unordered = /^\s*[-*]\s+(.+)$/.exec(line);
    const ordered = /^\s*\d+\.\s+(.+)$/.exec(line);
    if (unordered || ordered) {
      flushParagraph();
      const nextOrdered = Boolean(ordered);
      if (listItems.length > 0 && listOrdered !== nextOrdered) {
        flushList();
      }
      listOrdered = nextOrdered;
      listItems.push((ordered?.[1] ?? unordered?.[1] ?? "").trim());
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  if (inCode) {
    blocks.push({ type: "code", content: codeLines.join("\n") });
  }
  flushParagraph();
  flushList();

  return blocks.length > 0 ? blocks : [{ type: "paragraph", content }];
};

function isMarkdownTableStart(lines: string[], index: number) {
  const header = lines[index]?.trim();
  const separator = lines[index + 1]?.trim();
  return Boolean(
    header &&
      separator &&
      header.includes("|") &&
      /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(separator),
  );
}

function parseMarkdownTable(lines: string[], startIndex: number) {
  const headers = splitMarkdownTableRow(lines[startIndex]);
  const rows: string[][] = [];
  let index = startIndex + 2;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim() || !line.includes("|")) {
      break;
    }
    rows.push(splitMarkdownTableRow(line));
    index += 1;
  }

  return { headers, rows, nextIndex: index };
}

function splitMarkdownTableRow(line: string) {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

function renderInlineMarkdown(value: string, keyPrefix: number): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = pattern.exec(value))) {
    if (match.index > lastIndex) {
      nodes.push(value.slice(lastIndex, match.index));
    }

    const token = match[0];
    const key = `${keyPrefix}-${index++}`;
    if (token.startsWith("**")) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("`")) {
      nodes.push(
        <code key={key} className="rounded bg-muted px-1 py-0.5 text-xs">
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (link) {
        nodes.push(
          <a key={key} href={link[2]} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">
            {link[1]}
          </a>,
        );
      }
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < value.length) {
    nodes.push(value.slice(lastIndex));
  }

  return nodes;
}

function groupMessages(messages: UiMessage[]) {
  const groups: Array<{ id: string; user: UiMessage | null; agentMessages: UiMessage[] }> = [];
  let current: { id: string; user: UiMessage | null; agentMessages: UiMessage[] } | null = null;

  for (const message of messages) {
    if (message.role === "system") {
      continue;
    }

    if (message.role === "user") {
      current = {
        id: message.id,
        user: message,
        agentMessages: [],
      };
      groups.push(current);
      continue;
    }

    if (!current) {
      current = {
        id: `orphan-${message.id}`,
        user: null,
        agentMessages: [],
      };
      groups.push(current);
    }

    current.agentMessages.push(...expandAgentMessage(message));
  }

  return groups;
}

function expandAgentMessage(message: UiMessage): UiMessage[] {
  if (message.role !== "assistant") {
    return [message];
  }

  const steps: UiMessage[] = [];

  if (message.reasoning_content?.trim()) {
    steps.push({
      ...message,
      id: `${message.id}:reasoning`,
      role: "reasoning",
      content: message.reasoning_content,
      reasoning_content: undefined,
      tool_calls: undefined,
    });
  }

  if (message.tool_calls && message.tool_calls.length > 0) {
    steps.push(
      ...message.tool_calls.map((tool, index) => ({
        ...message,
        id: `${message.id}:tool-call:${tool.id ?? index}`,
        role: "tool_call",
        content: formatToolCallMessage(tool),
        reasoning_content: undefined,
        tool_calls: undefined,
      })),
    );
  }

  if (message.content.trim()) {
    steps.push({
      ...message,
      id: `${message.id}:final`,
      reasoning_content: undefined,
      tool_calls: undefined,
    });
  }

  if (steps.length === 0) {
    steps.push({
      ...message,
      id: `${message.id}:final`,
      reasoning_content: undefined,
      tool_calls: undefined,
    });
  }

  return steps;
}

function formatToolCallMessage(tool: NonNullable<ChatMessage["tool_calls"]>[number]) {
  const name = tool.function?.name ?? tool.type ?? "工具调用";
  const args = tool.function?.arguments ?? "";
  return args ? `${name}\n${args}` : name;
}

function toUiMessage(message: ChatMessage, index: number): UiMessage {
  return {
    ...message,
    id: `${index}-${message.role}-${message.content.slice(0, 16)}`,
  };
}

function roleLabel(role: string) {
  if (role === "user") return "用户";
  if (role === "assistant") return "Agent";
  if (role === "tool" || role === "tool_call") return "工具";
  if (role === "system") return "系统";
  return role;
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
