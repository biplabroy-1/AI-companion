import { MessageCircle, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import aiGirlfriendAvatar from "@/assets/ai-girlfriend-avatar.png";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "../ui/input";

export const WelcomeCard = () => {
  const [userName, setUserName] = useState("friend");
  const [companionName, setCompanionName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("+91");
  const moodRef = useRef("supportive");
  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      console.log(user);

      if (user?.user_metadata?.full_name) {
        setUserName(user.user_metadata.full_name);
      }

      const { data: config } = await supabase
        .from("companion_config")
        .select("companion_name , mood")
        .single();

      if (config) {
        setCompanionName(config.companion_name);
        moodRef.current = config.mood;
      }
    };

    fetchData();
  }, []);

  async function callUser() {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        toast.error("You must be logged in.");
        return;
      }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/call`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            contact: { name: userName, contact: phoneNumber },
          }),
        }
      );
      const responce = await res.json();
      if (responce.status) {
        toast("Success", { description: "Call initiated successfully." });
      }
    } catch (error) {
      console.log(error);
      toast("Error", { description: "Could not initiate call." });
    }
  }


  return (
    <Card className="gradient-friendly text-primary-foreground border-0 animate-glow">
      <CardContent className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <Avatar className="w-16 h-16 border-2 border-primary-foreground/20">
            <AvatarImage src={aiGirlfriendAvatar} alt="AI Companion" />
            <AvatarFallback className="bg-friendly text-friendly-foreground">AI</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-bold">Hey there, {userName}! 👋</h2>
            <p className="text-primary-foreground/80">{companionName} is {moodRef.current} to see you</p>
          </div>
        </div>

        <div className="flex gap-3">
          <Link to="/chat">
            <Button variant="outline" className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20">
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat Now
            </Button>
          </Link>
          <Input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="Your phone number" className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/60 focus:ring-primary-foreground/40 focus:border-primary-foreground/40" />
          <Button onClick={() => callUser()} variant="outline" className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20">
            <Phone className="w-4 h-4 mr-2" />
            Call
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};