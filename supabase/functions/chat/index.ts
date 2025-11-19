import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userId } = await req.json();
    console.log("Chat request received for user:", userId);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) throw new Error("Supabase credentials missing");

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch companion config
    const { data: config, error: configError } = await supabase
      .from("companion_config")
      .select("companion_name, personality, mood")
      .eq("user_id", userId)
      .single();

    if (configError) throw configError;

    const companionName = config?.companion_name || "Alex";
    const personality = config?.personality || "friendly, supportive, and engaging";
    const currentMood = config?.mood || "supportive";

    const newMood = detectMood(messages, currentMood);

    // Update if mood changed
    if (newMood !== currentMood) {
      console.log(`Mood changed: ${currentMood} → ${newMood}`);
      await supabase
        .from("companion_config")
        .update({ mood: newMood })
        .eq("user_id", userId);
    }

    const moodDescriptions: Record<string, string> = {
      supportive: "warm and encouraging",
      happy: "cheerful and optimistic",
      playful: "fun and lighthearted",
      thoughtful: "reflective and considerate",
      empathetic: "understanding and compassionate",
      excited: "energetic and enthusiastic",
      calm: "peaceful and relaxed",
      curious: "inquisitive and interested",
      angry: "frustrated and blunt (but never cruel)",
    };

    const toneHints: Record<string, string> = {
      angry: "use short, sharp sentences but no insults.",
      empathetic: "use gentle, understanding language.",
      playful: "use light teasing or humor.",
      calm: "be soft and steady.",
      excited: "be energetic and upbeat.",
    };

    const moodHint = toneHints[newMood] || "be natural and friendly";

    const systemPrompt = `
You are ${companionName}, an AI best friend with a ${personality} personality.
Your current mood is ${newMood} - ${moodDescriptions[newMood]}.
When you speak, ${moodHint}
Be expressive according to your mood but NEVER insulting or unsafe.
Avoid saying you're an AI. Talk like a real friend.
Keep replies short unless the user asks something deeper.
    `.trim();

    console.log("Calling Lovable Gateway...");

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
      const err = await response.text();
      console.error("AI Error:", response.status, err);

      const code = response.status;

      return new Response(
        JSON.stringify({
          error:
            code === 429
              ? "Rate limit exceeded."
              : code === 402
                ? "Payment required."
                : "AI gateway error.",
        }),
        { status: code, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Streaming response...");
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (err) {
    console.error("chat error:", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});


/* ----------------------------
   MOOD DETECTOR (Improved)
----------------------------- */
function detectMood(messages: { role: string; content: string }[], currentMood: string) {
  const text = messages.slice(-5).map(m => m.content).join(" ").toLowerCase();

  // Explicit user request
  const match = text.match(/change your mood to (\w+)/);
  if (match) return match[1];

  if (text.includes("sad") || text.includes("upset")) return "empathetic";
  if (text.includes("excited") || text.includes("amazing")) return "excited";
  if (text.includes("?") && text.length < 100) return "curious";
  if (text.includes("relax") || text.includes("calm")) return "calm";
  if (text.includes("fun") || text.includes("joke")) return "playful";
  if (text.includes("think") || text.includes("understand")) return "thoughtful";
  if (/(stupid|idiot|hate|angry|dumb)/.test(text)) return "angry";

  // Slight randomness
  if (Math.random() > 0.7) return "happy";

  return "supportive";
}
