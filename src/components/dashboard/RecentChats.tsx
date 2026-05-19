import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { MessageCircle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import aiGirlfriendAvatar from "@/assets/ai-girlfriend-avatar.png";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender: string;
}

export const RecentChats = () => {
  const [recentMessages, setRecentMessages] = useState<Message[]>([]);


  useEffect(() => {
    const fetchRecentMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("sender", "ai")
        .order("created_at", { ascending: false })
        .limit(3);

      if (data && !error) {
        setRecentMessages(data);
      }
    };

    fetchRecentMessages();
  }, []);

  return (
    <Card className="border-primary/20">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" />
          Recent Messages
        </CardTitle>
        <Link to="/chat">
          <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
            View All
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {recentMessages.length > 0 ? (
          recentMessages.map((msg) => (
            <Link to="/chat" key={msg.id} className="flex gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
              <Avatar className="w-8 h-8">
                <AvatarImage src={aiGirlfriendAvatar} alt="Alex" />
                <AvatarFallback className="bg-friendly text-friendly-foreground text-xs">A</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground line-clamp-2">{msg.content}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                </p>
              </div>
            </Link>
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No messages yet. Start a conversation!
          </p>
        )}

        <Link to="/chat" className="block">
          <Button className="w-full gradient-friendly text-primary-foreground border-0 hover:opacity-90">
            <MessageCircle className="w-4 h-4 mr-2" />
            Chat Now
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
};