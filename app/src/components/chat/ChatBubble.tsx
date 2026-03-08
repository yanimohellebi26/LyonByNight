"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ThumbsUp, ThumbsDown } from "lucide-react";

interface ChatBubbleProps {
  readonly role: "user" | "assistant";
  readonly content: string;
  readonly isLoading?: boolean;
}

export function ChatBubble({ role, content, isLoading }: ChatBubbleProps) {
  const t = useTranslations("chat");
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  return (
    <div
      className={`flex ${role === "user" ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          role === "user"
            ? "bg-primary text-primary-foreground"
            : "bg-card border"
        }`}
      >
        {isLoading ? (
          <div className="flex gap-1 py-1">
            <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
          </div>
        ) : (
          <div className="whitespace-pre-wrap">{formatContent(content)}</div>
        )}

        {/* Feedback buttons for assistant messages */}
        {role === "assistant" && !isLoading && content.length > 0 && (
          <div className="mt-2 flex items-center gap-1 border-t border-border/50 pt-1.5">
            <button
              onClick={() => setFeedback(feedback === "up" ? null : "up")}
              className={`rounded p-1 transition-colors ${
                feedback === "up"
                  ? "text-green-500"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label={t("useful")}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setFeedback(feedback === "down" ? null : "down")}
              className={`rounded p-1 transition-colors ${
                feedback === "down"
                  ? "text-red-500"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label={t("not_useful")}
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Format markdown-like bold (**text**) and [id:xxx] references in content.
 * - **text** → bold text
 * - [id:xxx] → hidden (the ChatMiniCards component handles these)
 */
function formatContent(text: string): React.ReactNode {
  // First strip [id:xxx] tags — they are rendered separately as mini-cards
  const cleaned = text.replace(/\[id:[^\]]+\]\s*/g, "");

  // Split on bold markers and render
  const parts = cleaned.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-primary">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}
