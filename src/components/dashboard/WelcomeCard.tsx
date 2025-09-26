import { Heart, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import aiGirlfriendAvatar from "@/assets/ai-girlfriend-avatar.png";

export const WelcomeCard = () => {
  return (
    <Card className="gradient-romantic text-white border-0 animate-glow">
      <CardContent className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <Avatar className="w-16 h-16 border-2 border-white/30">
            <AvatarImage src={aiGirlfriendAvatar} alt="AI Girlfriend" />
            <AvatarFallback className="bg-romantic text-romantic-foreground">AI</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-bold">Welcome back, darling! 💕</h2>
            <p className="text-white/80">Luna is excited to see you</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <Button variant="outline" className="bg-white/20 border-white/30 text-white hover:bg-white/30">
            <MessageCircle className="w-4 h-4 mr-2" />
            Chat Now
          </Button>
          <Button variant="outline" className="bg-white/20 border-white/30 text-white hover:bg-white/30">
            <Heart className="w-4 h-4 mr-2" />
            Send Love
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};