import client, { API_BASE_URL, unwrap } from "./client";
import type {
  ChatConversation,
  ChatConversationListResponse,
  ChatExportResponse,
  ChatMessage,
} from "@/types/api";

export interface ChatStreamEvent {
  type: "start" | "content" | "reasoning" | "tool_call" | "tool_result" | "tool" | "observation" | "end" | string;
  content?: string;
  reasoning?: string;
  reasoning_content?: string;
  tool_call?: {
    index?: number;
    id?: string;
    type?: string;
    function?: {
      name?: string;
      arguments?: unknown;
    };
  };
  function?: string | {
    name?: string;
    arguments?: unknown;
  };
  name?: string;
  tool_name?: string;
  id?: string;
  tool_call_id?: string;
  arguments?: unknown;
  result?: unknown;
  output?: unknown;
  data?: unknown;
  observation?: unknown;
  checkpoint_id?: string;
  message_count?: number;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export function createConversation(title: string) {
  return unwrap<ChatConversation>(client.post("/chat/conversations", { title }));
}

export function listConversations(params?: { page?: number; page_size?: number }) {
  return unwrap<ChatConversationListResponse>(client.get("/chat/conversations", { params }));
}

export function getConversationMessages(id: number) {
  return unwrap<ChatMessage[]>(client.get(`/chat/conversations/${id}`));
}

export function updateConversationTitle(id: number, title: string) {
  return unwrap<string>(client.put(`/chat/conversations/${id}`, { title }));
}

export function deleteConversation(id: number) {
  return unwrap<string>(client.delete(`/chat/conversations/${id}`));
}

export function exportConversation(id: number) {
  return unwrap<ChatExportResponse>(client.get(`/chat/conversations/${id}/export`));
}

export async function streamChat({
  conversationId,
  message,
  checkpointId,
  resumeInput,
  signal,
  onEvent,
}: {
  conversationId: number;
  message?: ChatMessage;
  checkpointId?: string;
  resumeInput?: string;
  signal?: AbortSignal;
  onEvent: (event: ChatStreamEvent) => void;
}) {
  const token = localStorage.getItem("token");
  const body = checkpointId
    ? {
        conversation_id: conversationId,
        checkpoint_id: checkpointId,
        resume_input: resumeInput ?? "",
      }
    : {
        conversation_id: conversationId,
        message,
      };

  const response = await fetch(`${API_BASE_URL}/chat/conversation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok || !response.body) {
    let messageText = `请求失败 (${response.status})`;
    try {
      const data = await response.json();
      messageText = data?.StatusMessage || data?.message || messageText;
    } catch {
      const text = await response.text().catch(() => "");
      messageText = text || messageText;
    }
    throw new Error(messageText);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });

    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line.startsWith("data:")) {
        continue;
      }

      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") {
        continue;
      }

      onEvent(JSON.parse(data) as ChatStreamEvent);
    }

    if (done) break;
  }

  const remaining = buffer.trim();
  if (remaining.startsWith("data:")) {
    const data = remaining.slice(5).trim();
    if (data && data !== "[DONE]") onEvent(JSON.parse(data) as ChatStreamEvent);
  }
}
