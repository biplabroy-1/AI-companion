import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Smile, Sparkles, Heart, Star, Brain, Zap, Wind, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const moodConfig = {
  supportive: { icon: Heart, label: "Supportive", color: "text-friendly", message: "Here to support you! 💝" },
  happy: { icon: Smile, label: "Happy", color: "text-primary", message: "Feeling great today! 😊" },
  playful: { icon: Sparkles, label: "Playful", color: "text-companion", message: "Let's have some fun! ✨" },
  thoughtful: { icon: Brain, label: "Thoughtful", color: "text-accent-foreground", message: "Thinking deeply... 🤔" },
  empathetic: { icon: Heart, label: "Empathetic", color: "text-friendly", message: "I'm here for you 💙" },
  excited: { icon: Zap, label: "Excited", color: "text-primary", message: "So excited to chat! ⚡" },
  calm: { icon: Wind, label: "Calm", color: "text-accent-foreground", message: "Peaceful and relaxed 🌊" },
  curious: { icon: Search, label: "Curious", color: "text-companion", message: "Let's explore together! 🔍" },
  angry: { icon: Zap, label: "Angry", color: "text-destructive", message: "I'm a bit upset right now 😠" },
};

export const MoodIndicator = () => {
  const [currentMood, setCurrentMood] = useState<keyof typeof moodConfig>("happy");
  const [companionName, setCompanionName] = useState("");

  useEffect(() => {
    const fetchMood = async () => {
      const { data } = await supabase
        .from("companion_config")
        .select("mood, companion_name")
        .single();

      if (data) {
        setCurrentMood(data.mood as keyof typeof moodConfig);
        setCompanionName(data.companion_name);
      }
    };

    fetchMood();

    // Set up real-time subscription for mood changes
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
            setCurrentMood(payload.new.mood as keyof typeof moodConfig);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const activeMood = moodConfig[currentMood];

  return (
    <Card className="border-companion/20">
      <CardHeader>
        <CardTitle className="text-friendly">{companionName}'s Mood</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(moodConfig).map(([key, mood]) => {
            const isActive = key === currentMood;
            return (
              <div
                key={key}
                className={`flex items-center gap-2 p-3 rounded-lg transition-all ${isActive
                  ? 'bg-friendly/10 border border-friendly/20'
                  : 'bg-muted/50 opacity-60'
                  }`}
              >
                <mood.icon className={`w-5 h-5 ${mood.color} ${isActive ? 'animate-pulse' : ''}`} />
                <span className="text-sm font-medium">{mood.label}</span>
                {isActive && (
                  <Badge variant="secondary" className="ml-auto bg-friendly/20 text-friendly text-xs">
                    Active
                  </Badge>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 p-3 rounded-lg bg-companion/10 border border-companion/20">
          <p className={cn("text-sm text-center font-medium", activeMood.color)}>
            {activeMood.message}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};