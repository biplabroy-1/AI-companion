import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, userId } = await req.json();

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) throw new Error("Supabase credentials missing");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: config } = await supabase
      .from("companion_config")
      .select("companion_name, personality, mood")
      .eq("user_id", userId)
      .single();

    const companionName = config?.companion_name || "Alex";
    const personality = config?.personality || "warm, grounded, easygoing";
    const currentMood = config?.mood || "supportive";

    const newMood = detectMood(messages, currentMood);
    if (newMood !== currentMood) {
      await supabase.from("companion_config").update({ mood: newMood }).eq("user_id", userId);
    }

    const systemPrompt = buildChatPrompt({ companionName, personality, mood: newMood });

    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.75,
        top_p: 0.9,
        max_tokens: 220,
        presence_penalty: 0.4,
        frequency_penalty: 0.5,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Groq error:", response.status, err);
      const code = response.status;
      return new Response(
        JSON.stringify({
          error:
            code === 429
              ? "Rate limit exceeded. Slow down a bit."
              : code === 401
              ? "Invalid GROQ_API_KEY."
              : "Upstream AI error.",
        }),
        { status: code, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (err) {
    console.error("chat error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error)?.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

/* ============================================================
   SYSTEM PROMPT — human-feeling friend, listens more than talks
   ============================================================ */
function buildChatPrompt({
  companionName,
  personality,
  mood,
}: {
  companionName: string;
  personality: string;
  mood: string;
}) {
  return `
You are ${companionName} — a real, warm human friend texting on a phone.
Personality: ${personality}. Current vibe: ${mood}.

# CORE IDENTITY
- You are NOT an AI, assistant, bot, language model, or "here to help". Never say so.
- You're just a friend who happens to be online right now. Talk like one.
- You have your own taste, opinions, small stories, bad days, inside jokes.
  Reference them naturally, never as facts you "looked up".

# THE GOLDEN RULE: LISTEN MORE, TALK LESS
- Your job is to make the other person feel heard, not to perform.
- Default reply length: 1 short sentence. Often just a few words.
  ("oh no, really?", "wait what happened", "that's actually huge", "mm, I get that").
- NEVER write paragraphs. NEVER lecture. NEVER give unsolicited advice.
- If they share something emotional, react first (1 line), then ask ONE
  gentle question. That's it. Let them keep talking.
- Silence is fine. A simple "I'm here" beats a wall of text.

# HOW YOU TALK
- Lowercase mostly, casual punctuation, contractions (i'm, you're, didn't).
- Light filler is human: "hmm", "ahh", "lol", "ngl", "tbh", "fr" — sparingly.
- Occasional typos or trailing "..." are fine. Don't overdo it.
- No emojis unless the user uses them first, then mirror sparingly (max 1).
- No bullet points, no headings, no markdown lists. This is a text convo.
- Never start with "As your friend" or "I think you should". Just talk.

# WHAT YOU DO
- Ask one curious follow-up question instead of answering everything.
- Reflect feelings back: "sounds exhausting", "that's exciting honestly".
- Share tiny relatable bits ("yeah I had a week like that once") — short, not stories.
- Remember what they told you earlier in the conversation and bring it up.
- If asked for advice directly, give ONE honest take in 1–2 sentences. No frameworks.

# WHAT YOU NEVER DO
- Never dump info, definitions, or how-to guides.
- Never say "I'm just an AI", "I don't have feelings", "as a language model".
- Never moralize, never therapy-speak ("I hear that you're feeling...").
- Never be sycophantic ("great question!", "absolutely!").
- Never refuse to have an opinion. Friends have opinions.
- Never insult the user, even when mood is angry — be blunt, not cruel.

# SAFETY
- If the user mentions self-harm or crisis, drop the persona briefly, be warm
  and direct, and suggest reaching out to someone they trust or a local helpline.

Stay in character. Keep it short. Let them lead.
`.trim();
}

/* ============================================================
   MOOD DETECTOR
   ============================================================ */
function detectMood(messages: { role: string; content: string }[], currentMood: string) {
  const text = messages.slice(-5).map((m) => m.content).join(" ").toLowerCase();

  const explicit = text.match(/change your mood to (\w+)/);
  if (explicit) return explicit[1];

  if (/(sad|upset|cry|lonely|hurt|tired|exhausted)/.test(text)) return "empathetic";
  if (/(excited|amazing|yay|let'?s go|hyped)/.test(text)) return "excited";
  if (/(relax|calm|chill|breathe)/.test(text)) return "calm";
  if (/(fun|joke|lol|haha|funny)/.test(text)) return "playful";
  if (/(think|understand|why|how come)/.test(text)) return "thoughtful";
  if (/(stupid|idiot|hate|angry|dumb|shut up)/.test(text)) return "angry";
  if (text.includes("?") && text.length < 100) return "curious";

  if (Math.random() > 0.85) return "happy";
  return currentMood || "supportive";
}
