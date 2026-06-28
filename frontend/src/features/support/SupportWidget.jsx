import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/api/client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { MessageCircle, X, Send, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SupportWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [localMessages, setLocalMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [whatsappLink, setWhatsappLink] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const scrollRef = useRef(null);

  const { data: existing } = useQuery({
    queryKey: ["support-conversation"],
    queryFn: async () => {
      const { data } = await apiClient.get("/support/chat/conversation");
      return data.data;
    },
    enabled: isOpen && !hydrated,
  });

  useEffect(() => {
    if (existing && !hydrated) {
      setConversationId(existing.id);
      setLocalMessages(existing.messages.map((m) => ({ sender: m.senderType, text: m.message })));
      if (existing.whatsappLink) setWhatsappLink(existing.whatsappLink);
      setHydrated(true);
    }
  }, [existing, hydrated]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [localMessages, isSending]);

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || isSending) return;

    const userText = input.trim();
    setInput("");
    setLocalMessages((prev) => [...prev, { sender: "USER", text: userText }]);
    setIsSending(true);

    try {
      const { data } = await apiClient.post("/support/chat/message", {
        message: userText,
        conversationId,
      });
      setConversationId(data.data.conversationId);
      setLocalMessages((prev) => [...prev, { sender: "AI", text: data.data.message }]);
      if (data.data.escalated) {
        setWhatsappLink(data.data.whatsappLink);
      }
    } catch {
      setLocalMessages((prev) => [
        ...prev,
        { sender: "AI", text: "Sorry, something went wrong. Please try again in a moment." },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
      {isOpen && (
        <div className="fixed bottom-24 right-4 z-50 flex h-[28rem] w-[calc(100vw-2rem)] max-w-sm flex-col rounded-xl border border-border bg-card shadow-2xl md:bottom-6 md:right-6 md:w-96">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="font-display text-sm font-semibold text-foreground">Elite Hub Support</p>
              <p className="text-xs text-muted-foreground">AI assistant · WhatsApp handoff if needed</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {localMessages.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Hi! Ask me about your wallet, an order, pricing, or anything else — I&apos;m here to help.
              </p>
            )}
            {localMessages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                  m.sender === "USER" ? "ml-auto bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                )}
              >
                {m.text}
              </div>
            ))}
            {isSending && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner className="h-4 w-4" />
                Typing...
              </div>
            )}
            {whatsappLink && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-500 hover:bg-emerald-500/20"
              >
                <ExternalLink className="h-4 w-4" />
                Continue on WhatsApp
              </a>
            )}
          </div>

          <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-border p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 rounded-lg border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button type="submit" size="sm" disabled={isSending || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}

      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 md:bottom-6 md:right-6"
        aria-label={isOpen ? "Close support chat" : "Open support chat"}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </>
  );
}
