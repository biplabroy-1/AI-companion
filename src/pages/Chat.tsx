import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Send, Smile } from "lucide-react";
import { Link } from "react-router-dom";
import aiGirlfriendAvatar from "@/assets/ai-girlfriend-avatar.png";

interface Message {
  id: number;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
}

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      content: "Hey! Great to see you! How's your day going? 😊",
      sender: "ai",
      timestamp: new Date(Date.now() - 120000),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: messages.length + 1,
      content: inputValue,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    setTimeout(() => {
      const aiResponse: Message = {
        id: messages.length + 2,
        content: "That's awesome! I love hearing about your day. What else is going on? 🌟",
        sender: "ai",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
    }, 1000);
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
            <AvatarImage src={aiGirlfriendAvatar} alt="Alex" />
            <AvatarFallback className="bg-friendly text-friendly-foreground">A</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-foreground">Alex</h1>
            <p className="text-xs text-muted-foreground">Online • Always here for you</p>
          </div>
        </div>
      </header>

      {/* Chat Messages */}
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <ScrollArea className="h-[calc(100vh-200px)]">
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
                  className={`max-w-[70%] ${
                    message.sender === "user" ? "items-end" : "items-start"
                  } space-y-1`}
                >
                  <Card
                    className={`p-3 ${
                      message.sender === "user"
                        ? "gradient-friendly text-white border-0"
                        : "bg-card border-friendly/20"
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                  </Card>
                  <p className="text-xs text-muted-foreground px-1">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
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
              className="gradient-friendly text-white border-0 hover:opacity-90"
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
