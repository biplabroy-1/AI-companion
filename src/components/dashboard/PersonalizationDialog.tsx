import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PersonalizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companionName: string;
  personality: string;
  onUpdate: () => void;
}

export const PersonalizationDialog = ({
  open,
  onOpenChange,
  companionName: initialName,
  personality: initialPersonality,
  onUpdate,
}: PersonalizationDialogProps) => {
  const [companionName, setCompanionName] = useState(initialName);
  const [personality, setPersonality] = useState(initialPersonality);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("companion_config")
        .update({
          companion_name: companionName,
          personality: personality,
        })
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id);

      if (error) throw error;

      toast("Success", {
        description: "Personalization settings updated!",
      });

      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      toast("Error", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Customize Your Companion</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="companion-name">Companion Name</Label>
            <Input
              id="companion-name"
              value={companionName}
              onChange={(e) => setCompanionName(e.target.value)}
              placeholder="e.g., Alex"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="personality">Personality</Label>
            <Textarea
              id="personality"
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              placeholder="e.g., friendly, supportive, and engaging"
              rows={4}
            />
          </div>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
