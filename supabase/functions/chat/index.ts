import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const moodConfig = {
  supportive: { message: "Here to support you! 💝" },
  happy: { message: "Feeling great today! 😊" },
  playful: { message: "Let's have some fun! ✨" },
  thoughtful: { message: "Thinking deeply... 🤔" },
  empathetic: { message: "I'm here for you 💙" },
  excited: { message: "So excited to chat! ⚡" },
  calm: { message: "Peaceful and relaxed 🌊" },
  curious: { message: "Let's explore together! 🔍" },
  angry: { message: "I'm a bit upset right now 😠" },
};

serve(async (req: Request) => {
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
    let newMood = detectMood(messages, currentMood);

    // Update mood in Supabase if it changed
    if (newMood !== currentMood) {
      console.log(`Mood changing from ${currentMood} to ${newMood}`);
      await supabase.from("companion_config").update({ mood: newMood }).eq("user_id", userId);
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
      curious: "inquisitive and interested, eager to learn",
      angry: "frustrated and blunt, speaking with short, sharp sentences but never cruel",
    };
    const toneHints: { [key: string]: string } = {
      angry: "use brief, sharp sentences and show frustration.",
      empathetic: "use gentle, understanding language.",
      playful: "use light jokes or teasing.",
      calm: "speak softly and reassuringly.",
      excited: "sound upbeat and enthusiastic."
    };

    const moodHint = toneHints[newMood] || "be natural and friendly";



    const systemPrompt = `You are ${companionName}, an AI best friend with a ${personality} personality.
Your current mood is ${newMood} - ${moodDescriptions[newMood] || "calm and caring"}.
When you speak, ${moodHint}.
Be expressive according to your mood. If you're angry or frustrated, let it show through tone or brevity,
but never be insulting or unsafe.
Avoid saying “I am an AI.” Speak like a real friend — authentic, emotional, and human-like.
You don’t always need to reply; sometimes just listen or respond shortly.
If the user asks why you're quiet or short, open up a little more.`;




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

function detectMood(messages: { role: string, content: string }[], currentMood: string) {
  const recentText = messages.slice(-5).map(m => m.content).join(" ").toLowerCase();
  let newMood = currentMood;

  // Explicit mood change by user command
  const match = recentText.match(/change your mood to (\w+)/);
  if (match) {
    newMood = match[1];
    return newMood;
  }

  // Detect emotional context
  if (recentText.includes("sad") || recentText.includes("upset")) newMood = "empathetic";
  else if (recentText.includes("excited") || recentText.includes("amazing")) newMood = "excited";
  else if (recentText.includes("?") && recentText.length < 100) newMood = "curious";
  else if (recentText.includes("relax") || recentText.includes("calm")) newMood = "calm";
  else if (recentText.includes("fun") || recentText.includes("joke")) newMood = "playful";
  else if (recentText.includes("think") || recentText.includes("understand")) newMood = "thoughtful";
  // Detect rude words
  else if (recentText.match(/(stupid|idiot|hate|angry|dumb)/)) newMood = "angry";
  else if (Math.random() > 0.7) newMood = "happy";
  else newMood = "supportive";

  return newMood;
}
