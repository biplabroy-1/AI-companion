import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Smile, Sparkles, Heart, Star } from "lucide-react";

const moods = [
  { icon: Heart, label: "Loving", color: "text-romantic", active: true },
  { icon: Smile, label: "Happy", color: "text-primary", active: true },
  { icon: Sparkles, label: "Playful", color: "text-love", active: false },
  { icon: Star, label: "Dreamy", color: "text-accent-foreground", active: false },
];

export const MoodIndicator = () => {
  return (
    <Card className="border-love/20">
      <CardHeader>
        <CardTitle className="text-romantic">Luna's Mood</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {moods.map((mood, index) => (
            <div 
              key={index}
              className={`flex items-center gap-2 p-3 rounded-lg transition-all ${
                mood.active 
                  ? 'bg-romantic/10 border border-romantic/20' 
                  : 'bg-muted/50 opacity-60'
              }`}
            >
              <mood.icon className={`w-5 h-5 ${mood.color} ${mood.active ? 'animate-pulse' : ''}`} />
              <span className="text-sm font-medium">{mood.label}</span>
              {mood.active && (
                <Badge variant="secondary" className="ml-auto bg-romantic/20 text-romantic text-xs">
                  Active
                </Badge>
              )}
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-3 rounded-lg bg-love/10 border border-love/20">
          <p className="text-sm text-center text-love-foreground">
            "I've been thinking about you all day! 💕"
          </p>
        </div>
      </CardContent>
    </Card>
  );
};