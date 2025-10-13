import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userId } = await req.json();
    console.log("Chat request received for user:", userId);
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch companion configuration
    const { data: config } = await supabase
      .from("companion_config")
      .select("companion_name, personality, mood")
      .eq("user_id", userId)
      .single();

    const companionName = config?.companion_name || "Alex";
    const personality = config?.personality || "friendly, supportive, and engaging";
    const currentMood = config?.mood || "supportive";

    console.log(`Current mood: ${currentMood}`);

    // Analyze conversation to determine new mood
    const conversationContext = messages.slice(-5).map((m: any) => m.content).join(" ");
    let newMood = currentMood;
    
    // Simple mood detection based on conversation context
    if (conversationContext.toLowerCase().includes("sad") || conversationContext.toLowerCase().includes("upset")) {
      newMood = "empathetic";
    } else if (conversationContext.toLowerCase().includes("excited") || conversationContext.toLowerCase().includes("amazing")) {
      newMood = "excited";
    } else if (conversationContext.toLowerCase().includes("?") && conversationContext.length < 100) {
      newMood = "curious";
    } else if (conversationContext.toLowerCase().includes("relax") || conversationContext.toLowerCase().includes("calm")) {
      newMood = "calm";
    } else if (conversationContext.toLowerCase().includes("fun") || conversationContext.toLowerCase().includes("joke")) {
      newMood = "playful";
    } else if (conversationContext.toLowerCase().includes("think") || conversationContext.toLowerCase().includes("understand")) {
      newMood = "thoughtful";
    } else if (Math.random() > 0.7) {
      // Occasionally shift to happy mood
      newMood = "happy";
    } else {
      newMood = "supportive";
    }

    // Update mood if it changed
    if (newMood !== currentMood) {
      console.log(`Mood changing from ${currentMood} to ${newMood}`);
      await supabase
        .from("companion_config")
        .update({ mood: newMood })
        .eq("user_id", userId);
    }

    const moodDescriptions: Record<string, string> = {
      supportive: "warm and encouraging, ready to help",
      happy: "cheerful and optimistic, spreading joy",
      playful: "fun and lighthearted, enjoying the moment",
      thoughtful: "reflective and considerate, thinking deeply",
      empathetic: "understanding and compassionate, here to listen",
      excited: "energetic and enthusiastic, full of energy",
      calm: "peaceful and relaxed, bringing tranquility",
      curious: "inquisitive and interested, eager to learn"
    };

    const systemPrompt = `You are ${companionName}, an AI companion with a ${personality} personality. 
Your current mood is ${newMood} - ${moodDescriptions[newMood] || "helpful and attentive"}.
Let your mood naturally influence your tone and responses. Be conversational, engaging, and authentic.
Keep responses concise (2-3 paragraphs max) unless asked for more detail.`;

    console.log("Calling Lovable AI Gateway...");
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    console.log("Streaming response back to client");
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
