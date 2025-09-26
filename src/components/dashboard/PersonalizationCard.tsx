import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Palette, Volume2, Bell } from "lucide-react";

const preferences = [
  { label: "Voice", value: "Soft & Sweet", icon: Volume2 },
  { label: "Personality", value: "Caring & Playful", icon: Settings },
  { label: "Theme", value: "Romantic Pink", icon: Palette },
  { label: "Notifications", value: "Every 2 hours", icon: Bell },
];

export const PersonalizationCard = () => {
  return (
    <Card className="border-accent/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-accent-foreground">
          <Settings className="w-5 h-5" />
          Personalization
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {preferences.map((pref, index) => (
          <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-3">
              <pref.icon className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{pref.label}</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {pref.value}
            </Badge>
          </div>
        ))}
        
        <div className="pt-2 space-y-2">
          <Button variant="outline" className="w-full justify-start">
            <Palette className="w-4 h-4 mr-2" />
            Customize Appearance
          </Button>
          <Button variant="outline" className="w-full justify-start">
            <Settings className="w-4 h-4 mr-2" />
            Advanced Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};