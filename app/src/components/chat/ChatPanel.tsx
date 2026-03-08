"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { useTranslations } from "next-intl";
import { MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatBubble } from "./ChatBubble";
import { ChatSuggestions, ChatContextBanner } from "./ChatSuggestions";
import { ChatMiniCards } from "./ChatMiniCards";

/** Extract text from UIMessage parts */
function getMessageText(message: { parts: Array<{ type: string; text?: string }> }): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text" && typeof p.text === "string")
    .map((p) => p.text)
    .join("");
}

export function ChatPanel() {
  const t = useTranslations("chat");
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error } = useChat({
    onError: (err) => {
      console.error("Chat error:", err);
    },
  });

  const isLoading = status === "submitted" || status === "streaming";

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const text = input.trim();
      if (!text || isLoading) return;
      setInput("");
      sendMessage({ text });
    },
    [input, isLoading, sendMessage]
  );

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      sendMessage({ text: suggestion });
    },
    [sendMessage]
  );

  // Extract lieu IDs referenced in the last assistant message via [id:xxx] pattern
  const lastAssistantMsg = [...messages].reverse().find((m) => m.role === "assistant");
  const lastText = lastAssistantMsg ? getMessageText(lastAssistantMsg) : "";
  const lieuIdMatches = lastText.match(/\[id:([^\]]+)\]/g);
  const lastAssistantLieuIds = lieuIdMatches
    ? lieuIdMatches.map((match) => match.slice(4, -1))
    : [];

  return (
    <>
      {/* Floating chat button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 md:bottom-6"
          aria-label={t("title")}
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 z-50 flex h-[70vh] w-full flex-col border-l bg-background shadow-2xl md:bottom-6 md:right-6 md:h-[600px] md:w-[400px] md:rounded-2xl md:border">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <MessageCircle className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">{t("title")}</h3>
                <p className="text-[10px] text-muted-foreground">
                  {isLoading ? t("thinking") : t("online")}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsOpen(false)}
              aria-label={t("close")}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center gap-4 pt-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <MessageCircle className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground max-w-[250px]">
                  {t("welcome")}
                </p>
                {/* Contextual banner based on time of day */}
                <ChatContextBanner onSelect={handleSuggestionClick} />
                <ChatSuggestions onSelect={handleSuggestionClick} />
              </div>
            )}

            {messages.map((message) => (
              <ChatBubble
                key={message.id}
                role={message.role as "user" | "assistant"}
                content={getMessageText(message)}
              />
            ))}

            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <ChatBubble role="assistant" content="" isLoading />
            )}

            {error && !isLoading && (
              <div className="mx-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                {error.message || "An error occurred. Please try again."}
              </div>
            )}

            {/* Mini-cards for referenced lieux — deep links to venue pages */}
            {lastAssistantLieuIds.length > 0 && !isLoading && (
              <ChatMiniCards lieuIds={lastAssistantLieuIds} />
            )}
          </div>

          {/* Suggestions after first response */}
          {messages.length > 0 && messages.length <= 4 && !isLoading && (
            <div className="border-t px-4 py-2">
              <ChatSuggestions onSelect={handleSuggestionClick} />
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t px-4 py-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("placeholder")}
              className="flex-1"
              disabled={isLoading}
              autoComplete="off"
            />
            <Button
              type="submit"
              size="icon-sm"
              disabled={isLoading || !input.trim()}
              className="shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
