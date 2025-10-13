import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Heart, MessageSquare, Clock, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { intervalToDuration } from "date-fns";

export const StatsCard = () => {
  const [messageCount, setMessageCount] = useState(0);
  const [companionName, setCompanionName] = useState("Alex");
  const [personality, setPersonality] = useState("supportive");
  const [daysActive, setDaysActive] = useState("0min");

  useEffect(() => {
    const fetchStats = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get message count
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("sender", "user");

      if (count) setMessageCount(count);

      // Get companion config
      const { data: config } = await supabase
        .from("companion_config")
        .select("companion_name, personality")
        .single();

      if (config) {
        setCompanionName(config.companion_name);
        setPersonality(config.personality.split(",")[0].trim());
      }

      // Calculate days active
      const { data: profile } = await supabase
        .from("profiles")
        .select("created_at")
        .single();

      if (profile) {
        const createdAt = new Date(profile.created_at);
        const now = new Date();

        const duration = intervalToDuration({
          start: createdAt,
          end: now,
        });

        const parts: string[] = [];

        if (duration.years) parts.push(`${duration.years}y`);
        if (duration.months) parts.push(`${duration.months}m`);
        if (duration.days) parts.push(`${duration.days}d`);
        if (duration.hours) parts.push(`${duration.hours}h`);
        if (duration.minutes) parts.push(`${duration.minutes}min`);

        const result = parts.length > 0 ? parts.join(' ') : 'Just now';

        setDaysActive(result);
      }
    };

    fetchStats();
  }, []);

  const friendshipLevel = Math.min(10, Math.floor(messageCount / 100) + 1);
  const progress = ((messageCount % 100) / 100) * 100;

  return (
    <Card className="border-friendly/20">
      <CardHeader>
        <CardTitle className="gradient-text">Your Friendship</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-friendly" />
            <span className="text-sm">Friendship Level</span>
          </div>
          <Badge variant="secondary" className="bg-companion text-companion-foreground">Level {friendshipLevel}</Badge>
        </div>
        <Progress value={progress} className="h-2" />

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="text-center p-3 rounded-lg bg-accent/50">
            <MessageSquare className="w-5 h-5 text-primary mx-auto mb-1" />
            <div className="text-lg font-semibold text-primary">{messageCount.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Messages</div>
          </div>

          <div className="text-center p-3 rounded-lg bg-accent/50">
            <Clock className="w-5 h-5 text-friendly mx-auto mb-1" />
            <div className="text-lg font-semibold text-friendly">{daysActive} </div>
            <div className="text-xs text-muted-foreground">Days Active</div>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Sparkles className="w-4 h-4 text-friendly animate-pulse" />
          <span className="text-sm text-muted-foreground">{companionName} is feeling <span className="text-friendly font-medium">{personality}</span> today</span>
        </div>
      </CardContent>
    </Card>
  );
};