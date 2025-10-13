import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, User } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PersonalizationDialog } from "./PersonalizationDialog";

export const PersonalizationCard = () => {
  const [companionName, setCompanionName] = useState("Alex");
  const [personality, setPersonality] = useState("friendly, supportive, and engaging");
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const fetchConfig = async () => {
    const { data } = await supabase
      .from("companion_config")
      .select("companion_name, personality")
      .single();
    
    if (data) {
      setCompanionName(data.companion_name);
      setPersonality(data.personality);
    }
  };
  
  useEffect(() => {
    fetchConfig();
  }, []);

  return (
    <>
      <Card className="border-accent/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-accent-foreground">
            <Settings className="w-5 h-5" />
            Personalization
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Companion Name</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {companionName}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-3">
              <Settings className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Personality</span>
            </div>
            <Badge variant="outline" className="text-xs line-clamp-1 max-w-[120px]">
              {personality.split(",")[0]}...
            </Badge>
          </div>
          
          <div className="pt-2">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => setDialogOpen(true)}
            >
              <Settings className="w-4 h-4 mr-2" />
              Customize Settings
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <PersonalizationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        companionName={companionName}
        personality={personality}
        onUpdate={fetchConfig}
      />
    </>
  );
};