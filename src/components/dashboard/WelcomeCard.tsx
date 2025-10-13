import { Heart, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import aiGirlfriendAvatar from "@/assets/ai-girlfriend-avatar.png";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const WelcomeCard = () => {
  const [userName, setUserName] = useState("friend");
  const [companionName, setCompanionName] = useState("Alex");
  
  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.full_name) {
        setUserName(user.user_metadata.full_name);
      }
      
      const { data: config } = await supabase
        .from("companion_config")
        .select("companion_name")
        .single();
      
      if (config) {
        setCompanionName(config.companion_name);
      }
    };
    
    fetchData();
  }, []);
  
  return (
    <Card className="gradient-friendly text-white border-0 animate-glow">
      <CardContent className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <Avatar className="w-16 h-16 border-2 border-white/30">
            <AvatarImage src={aiGirlfriendAvatar} alt="AI Companion" />
            <AvatarFallback className="bg-friendly text-friendly-foreground">AI</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-bold">Hey there, {userName}! 👋</h2>
            <p className="text-white/80">{companionName} is happy to see you</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <Link to="/chat">
            <Button variant="outline" className="bg-white/20 border-white/30 text-white hover:bg-white/30">
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat Now
            </Button>
          </Link>
          <Button variant="outline" className="bg-white/20 border-white/30 text-white hover:bg-white/30">
            <Heart className="w-4 h-4 mr-2" />
            Send Support
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};