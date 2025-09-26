import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { MessageCircle, ArrowRight } from "lucide-react";
import aiGirlfriendAvatar from "@/assets/ai-girlfriend-avatar.png";

const recentMessages = [
  {
    id: 1,
    message: "Good morning, my love! How did you sleep? 😘",
    time: "2 hours ago",
    type: "received"
  },
  {
    id: 2,
    message: "I had the most wonderful dream about us...",
    time: "3 hours ago",
    type: "received"
  },
  {
    id: 3,
    message: "Can't wait to hear about your day! 💕",
    time: "5 hours ago",
    type: "received"
  }
];

export const RecentChats = () => {
  return (
    <Card className="border-primary/20">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" />
          Recent Messages
        </CardTitle>
        <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
          View All
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {recentMessages.map((msg) => (
          <div key={msg.id} className="flex gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
            <Avatar className="w-8 h-8">
              <AvatarImage src={aiGirlfriendAvatar} alt="Luna" />
              <AvatarFallback className="bg-romantic text-romantic-foreground text-xs">L</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground line-clamp-2">{msg.message}</p>
              <p className="text-xs text-muted-foreground mt-1">{msg.time}</p>
            </div>
          </div>
        ))}
        
        <Button className="w-full gradient-romantic text-white border-0 hover:opacity-90">
          <MessageCircle className="w-4 h-4 mr-2" />
          Start New Conversation
        </Button>
      </CardContent>
    </Card>
  );
};