import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Send, Smile } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import aiGirlfriendAvatar from "@/assets/ai-girlfriend-avatar.png";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { moodConfig } from "@/lib/shared";

function buildSharedContextSummary(
  messages: Message[],
  assistantContent?: string,
  companionName?: string,
  personality?: string,
  mood?: string,
) {
  const recentMessages = messages.slice(-12).map((message) =>
    `${message.sender}: ${message.content.replace(/\s+/g, " ").trim()}`
  );

  if (assistantContent?.trim()) {
    recentMessages.push(`ai: ${assistantContent.replace(/\s+/g, " ").trim()}`);
  }

  const sections = [
    companionName ? `latest chat context for ${companionName}:` : "latest chat context:",
  ];

  if (personality || mood) {
    sections.push(`persona: ${[personality, mood].filter(Boolean).join(" | ")}`);
  }

  sections.push(...recentMessages);

  const summary = sections.join("\n");
  return summary.length > 1600 ? `${summary.slice(0, 1599).trimEnd()}…` : summary;
}

interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  created_at: string;
}

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [companionName, setCompanionName] = useState("");
  const [mood, setMood] = useState("");
  const [personality, setPersonality] = useState("friendly, supportive, and engaging");
  const [userId, setUserId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Load or create conversation
  useEffect(() => {
    const initializeConversation = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          navigate("/auth");
          return;
        }

        setUserId(user.id);

        // Get companion config
        const { data: config } = await supabase
          .from('companion_config')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (config) {
          setCompanionName(config.companion_name);
          setPersonality(config.personality);
          setMood(config.mood);
        }

        // Get or create conversation
        const { data: conversations, error: convError } = await supabase
          .from('conversations')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1);

        if (convError) throw convError;

        let activeConversationId: string;

        if (conversations && conversations.length > 0) {
          activeConversationId = conversations[0].id;
        } else {
          // Create new conversation
          const { data: newConv, error: createError } = await supabase
            .from('conversations')
            .insert([{ user_id: user.id, title: `Chat with ${companionName}` }])
            .select()
            .single();

          if (createError) throw createError;
          activeConversationId = newConv.id;

          // Add initial AI message
          await supabase
            .from('messages')
            .insert([{
              conversation_id: activeConversationId,
              content: "Hey! Great to see you! How's your day going? 😊",
              sender: 'ai'
            }]);
        }

        setConversationId(activeConversationId);

        // Load messages
        const { data: msgs, error: msgsError } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', activeConversationId)
          .order('created_at', { ascending: true });

        if (msgsError) throw msgsError;

        setMessages((msgs || []) as Message[]);
      } catch (error: any) {
        toast("Error", {
          description: error.message
        });
      } finally {
        setIsLoading(false);
      }
    };

    initializeConversation();

    const channel = supabase
      .channel('mood-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'companion_config'
        },
        (payload) => {
          if (payload.new?.mood) {
            setMood(payload.new.mood as keyof typeof moodConfig);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate, companionName]);

  const handleSend = async () => {
    if (!inputValue.trim() || !conversationId || isSending) return;

    const userContent = inputValue;
    setInputValue("");
    setIsSending(true);

    try {
      // Save user message
      const { data: userMsg, error: userError } = await supabase
        .from('messages')
        .insert([{
          conversation_id: conversationId,
          content: userContent,
          sender: 'user'
        }])
        .select()
        .single();

      if (userError) throw userError;

      setMessages((prev) => [...prev, userMsg as Message]);

      // Stream AI response
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
      const chatMessages = messages.map(m => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.content
      }));
      chatMessages.push({ role: "user", content: userContent });

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: chatMessages,
          userId,
          conversationId,
        }),
      });

      if (!resp.ok) {
        if (resp.status === 429) {
          toast("Rate limit exceeded", {
            description: "Please try again in a moment.",
          });
          return;
        }
        if (resp.status === 402) {
          toast("Payment required", {
            description: "Please add funds to your Lovable AI workspace.",
          });
          return;
        }
        throw new Error("Failed to start stream");
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;
      let assistantContent = "";
      let tempAiMsgId: string | null = null;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;

              // Update UI with streaming content
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.id === tempAiMsgId) {
                  return prev.map((m) =>
                    m.id === tempAiMsgId ? { ...m, content: assistantContent } : m
                  );
                }
                // Create temporary message
                const tempMsg: Message = {
                  id: `temp-${Date.now()}`,
                  content: assistantContent,
                  sender: "ai",
                  created_at: new Date().toISOString(),
                };
                tempAiMsgId = tempMsg.id;
                return [...prev, tempMsg];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Save final AI message to database
      if (assistantContent) {
        const { data: aiMsg } = await supabase
          .from('messages')
          .insert([{
            conversation_id: conversationId,
            content: assistantContent,
            sender: 'ai'
          }])
          .select()
          .single();

        // Replace temp message with real one
        if (aiMsg) {
          setMessages((prev) =>
            prev.map((m) => m.id === tempAiMsgId ? aiMsg as Message : m)
          );
        }

        const sharedContext = buildSharedContextSummary(
          [...messages, userMsg as Message],
          assistantContent,
          companionName,
          personality,
          mood,
        );

        await supabase
          .from('companion_config')
          .update({ shared_context: sharedContext })
          .eq('user_id', userId);
      }
    } catch (error: any) {
      toast("Error", {
        description: "Failed to send message. Please try again.",
      });
      setInputValue(userContent);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-friendly/5 to-background">
      {/* Header */}
      <header className="border-b border-friendly/20 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon" className="text-friendly hover:text-friendly/80">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <Avatar className="w-10 h-10 border-2 border-friendly/30">
            <AvatarImage src={aiGirlfriendAvatar} alt={companionName} />
            <AvatarFallback className="bg-friendly text-friendly-foreground">
              {companionName[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">

              <h1 className="text-lg font-semibold text-foreground">{companionName}</h1>
              <Badge>{mood}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">Online • Always here for you</p>
          </div>
        </div>
      </header>

      {/* Chat Messages */}
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <ScrollArea className="h-[calc(100vh-200px)]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Loading conversation...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.sender === "user" ? "flex-row-reverse" : ""}`}
                >
                  {message.sender === "ai" && (
                    <Avatar className="w-8 h-8 border border-friendly/20">
                      <AvatarImage src={aiGirlfriendAvatar} alt="Alex" />
                      <AvatarFallback className="bg-friendly text-friendly-foreground text-xs">
                        A
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`max-w-[70%] ${message.sender === "user" ? "items-end" : "items-start"
                      } space-y-1`}
                  >
                    <Card
                      className={`p-3 ${message.sender === "user"
                        ? "gradient-friendly text-primary-foreground border-0"
                        : "bg-card border-friendly/20"
                        }`}
                    >
                      <p className="text-sm">{message.content}</p>
                    </Card>
                    <p className="text-xs text-muted-foreground px-1">
                      {new Date(message.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-friendly/20 bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          <div className="flex gap-2 items-end">
            <Button
              variant="ghost"
              size="icon"
              className="text-friendly hover:text-friendly/80 mb-1"
            >
              <Smile className="w-5 h-5" />
            </Button>
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 border-friendly/20 focus-visible:ring-friendly"
            />
            <Button
              onClick={handleSend}
              className="gradient-friendly text-primary-foreground border-0 hover:opacity-90"
              disabled={isSending}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
