import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Smile, Sparkles, Heart, Star } from "lucide-react";

const moods = [
  { icon: Heart, label: "Supportive", color: "text-friendly", active: true },
  { icon: Smile, label: "Happy", color: "text-primary", active: true },
  { icon: Sparkles, label: "Playful", color: "text-companion", active: false },
  { icon: Star, label: "Thoughtful", color: "text-accent-foreground", active: false },
];

export const MoodIndicator = () => {
  return (
    <Card className="border-companion/20">
      <CardHeader>
        <CardTitle className="text-friendly">Alex's Mood</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {moods.map((mood, index) => (
            <div 
              key={index}
              className={`flex items-center gap-2 p-3 rounded-lg transition-all ${
                mood.active 
                  ? 'bg-friendly/10 border border-friendly/20' 
                  : 'bg-muted/50 opacity-60'
              }`}
            >
              <mood.icon className={`w-5 h-5 ${mood.color} ${mood.active ? 'animate-pulse' : ''}`} />
              <span className="text-sm font-medium">{mood.label}</span>
              {mood.active && (
                <Badge variant="secondary" className="ml-auto bg-friendly/20 text-friendly text-xs">
                  Active
                </Badge>
              )}
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-3 rounded-lg bg-companion/10 border border-companion/20">
          <p className="text-sm text-center text-companion-foreground">
            "Hope you're having a great day! 😊"
          </p>
        </div>
      </CardContent>
    </Card>
  );
};