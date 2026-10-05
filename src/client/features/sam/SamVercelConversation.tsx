import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Markdown } from "@/client/components/Markdown";
import { ChatComposer } from "./ChatComposer";
import {
  getSamVercelMessages,
  sendSamVercelMessage,
} from "@/serverFunctions/samVercel";
import { invalidateSamSessions } from "./samQueries";
import { getStandardErrorMessage } from "@/client/lib/error-messages";

const SUGGESTIONS = [
  "برای سایت من چه کلمات کلیدی مهم‌اند؟",
  "رقبای اصلی من در نتایج جست‌وجو چه کسانی هستند؟",
  "از داده‌های سرچ کنسول چه فرصت‌هایی پیدا می‌کنی؟",
];

export function SamVercelConversation({
  projectId,
  sessionId,
}: {
  projectId: string;
  sessionId: string;
}) {
  const queryClient = useQueryClient();
  const queryKey = ["samVercelMessages", projectId, sessionId];
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pendingText, setPendingText] = useState<string | null>(null);
  const messagesQuery = useQuery({
    queryKey,
    queryFn: () => getSamVercelMessages({ data: { projectId, sessionId } }),
  });
  const send = useMutation({
    mutationFn: (text: string) =>
      sendSamVercelMessage({ data: { projectId, sessionId, text } }),
    onSuccess: () => {
      setPendingText(null);
      void queryClient.invalidateQueries({ queryKey });
      invalidateSamSessions(projectId);
    },
    onError: () => {
      setPendingText(null);
      void queryClient.invalidateQueries({ queryKey });
    },
  });
  const messages = messagesQuery.data;

  useEffect(() => {
    const pane = scrollRef.current;
    if (pane) pane.scrollTop = pane.scrollHeight;
  }, [messages, pendingText]);

  const sendText = (text: string) => {
    setPendingText(text);
    send.mutate(text);
  };

  return (
    <div dir="rtl" className="flex min-w-0 flex-1 flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
        <div className="mx-auto max-w-2xl space-y-4">
          {messagesQuery.isPending && (
            <div className="flex justify-center" role="status">
              <Loader2 className="size-5 animate-spin" />
            </div>
          )}
          {messagesQuery.isError && (
            <p className="text-sm text-error">تاریخچهٔ گفت‌وگو دریافت نشد.</p>
          )}
          {messages?.length === 0 && !messagesQuery.isPending && (
            <div className="space-y-3 text-sm leading-7">
              <p>
                سلام، من SAM هستم. دربارهٔ سئو و داده‌های این پروژه از من
                بپرسید.
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={send.isPending}
                    onClick={() => sendText(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages?.map((message) => (
            <div
              key={message.id}
              className={
                message.role === "user"
                  ? "mr-auto max-w-[85%] rounded-2xl bg-primary p-3 text-primary-content"
                  : "max-w-full rounded-2xl bg-base-200 p-4 text-base-content"
              }
            >
              {message.role === "user" ? (
                <p className="whitespace-pre-wrap text-sm">{message.content}</p>
              ) : (
                <Markdown>{message.content}</Markdown>
              )}
            </div>
          ))}
          {pendingText && (
            <div className="space-y-3" role="status">
              <p className="mr-auto max-w-[85%] rounded-2xl bg-primary p-3 text-sm text-primary-content">
                {pendingText}
              </p>
              <p className="flex items-center gap-2 text-sm text-base-content/60">
                <Loader2 className="size-4 animate-spin" />
                SAM در حال بررسی است…
              </p>
            </div>
          )}
          {send.isError && (
            <div className="alert alert-error text-sm" role="alert">
              <span>
                {getStandardErrorMessage(send.error, "پاسخ SAM دریافت نشد.")}{" "}
                درخواست خودکار تکرار نمی‌شود تا هزینهٔ دوباره ایجاد نشود.
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="shrink-0 border-t border-base-300 px-5 py-3">
        <div className="mx-auto max-w-2xl">
          <ChatComposer
            busy={send.isPending}
            onSend={sendText}
            placeholder="از SAM دربارهٔ سئوی پروژه بپرسید…"
          />
        </div>
      </div>
    </div>
  );
}
