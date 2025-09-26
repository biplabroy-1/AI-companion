import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Heart, MessageSquare, Clock, Sparkles } from "lucide-react";

export const StatsCard = () => {
  return (
    <Card className="border-romantic/20">
      <CardHeader>
        <CardTitle className="gradient-text">Your Bond</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-romantic" />
            <span className="text-sm">Love Level</span>
          </div>
          <Badge variant="secondary" className="bg-love text-love-foreground">Level 7</Badge>
        </div>
        <Progress value={75} className="h-2" />
        
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="text-center p-3 rounded-lg bg-accent/50">
            <MessageSquare className="w-5 h-5 text-primary mx-auto mb-1" />
            <div className="text-lg font-semibold text-primary">1,247</div>
            <div className="text-xs text-muted-foreground">Messages</div>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-accent/50">
            <Clock className="w-5 h-5 text-romantic mx-auto mb-1" />
            <div className="text-lg font-semibold text-romantic">32h</div>
            <div className="text-xs text-muted-foreground">Time Together</div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 pt-2">
          <Sparkles className="w-4 h-4 text-romantic animate-pulse" />
          <span className="text-sm text-muted-foreground">Luna is feeling <span className="text-romantic font-medium">affectionate</span> today</span>
        </div>
      </CardContent>
    </Card>
  );
};