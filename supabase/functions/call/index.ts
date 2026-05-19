import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildSharedContextPrompt, buildSharedContextSummary } from "../_shared/context.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// -------------------- CONSTANTS --------------------
const E164_REGEX = /^\+[1-9]\d{1,14}$/;
const MAX_NAME_LENGTH = 10;
const ALLOWED_CONTACT_KEYS = new Set(["name", "contact"]); // contact.contact = phone

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    if (req.method !== "POST") {
        return json({ error: "Method not allowed" }, 405);
    }

    try {
        const { contact } = await req.json();

        let sanitizedContact;
        try {
            sanitizedContact = validateContact(contact);
        } catch (err: unknown) {
            return json({ error: err instanceof Error ? err.message : "Invalid contact" }, 400);
        }

        // ---------------- AUTH ----------------
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (!supabaseUrl || !supabaseKey) {
            return json({ error: "Supabase credentials missing" }, 500);
        }

        const authHeader = req.headers.get("Authorization") ?? "";
        const supabase = createClient(supabaseUrl, supabaseKey, {
            global: { headers: { Authorization: authHeader } },
        });

        const { data: userResult, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userResult?.user) {
            return json({ error: "Unauthorized" }, 401);
        }

        // ---------------- TWILIO ----------------
        const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
        const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
        const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

        if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
            return json(
                {
                    error:
                        "Twilio configuration missing. Configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER.",
                },
                400,
            );
        }

        // ---------------- VAPI ----------------
        const VAPI_API_KEY = Deno.env.get("VAPI_API_KEY");
        const VAPI_ASSISTANT_ID = Deno.env.get("VAPI_ASSISTANT_ID");

        if (!VAPI_API_KEY || !VAPI_ASSISTANT_ID) {
            return json({ error: "VAPI configuration incomplete" }, 500);
        }

        const { data: config } = await supabase
            .from("companion_config")
            .select("companion_name, personality, mood, shared_context")
            .eq("user_id", userResult.user.id)
            .single();

        const { data: conversations } = await supabase
            .from("conversations")
            .select("id")
            .eq("user_id", userResult.user.id)
            .order("updated_at", { ascending: false })
            .limit(1);

        const activeConversationId = conversations?.[0]?.id;

        let recentMessages: Array<{ role: string; content: string }> = [];
        if (activeConversationId) {
            const { data: history } = await supabase
                .from("messages")
                .select("sender, content")
                .eq("conversation_id", activeConversationId)
                .order("created_at", { ascending: true })
                .limit(12);

            recentMessages = (history || []).map((message: { sender: string; content: string }) => ({
                role: message.sender === "user" ? "user" : "assistant",
                content: message.content,
            }));
        }

        const sharedContext = buildSharedContextSummary({
            source: "call",
            existingContext: config?.shared_context,
            recentMessages,
            companionName: config?.companion_name ?? sanitizedContact.name,
            personality: config?.personality,
            currentMood: config?.mood,
            note: `outbound call requested for ${sanitizedContact.name}`,
        });

        await supabase
            .from("companion_config")
            .update({ shared_context: sharedContext })
            .eq("user_id", userResult.user.id);

        const vapiRequestBody = {
            assistantId: VAPI_ASSISTANT_ID,
            customer: {
                name: sanitizedContact.name,
                number: sanitizedContact.number,
            },
            assistantOverrides: {
                firstMessage: `hey ${sanitizedContact.name}, it's me. you got a sec?`,
                model: {
                    messages: [
                        {
                            role: "system",
                            content: buildCallPrompt(
                                sanitizedContact.name,
                                sharedContext,
                                config?.companion_name ?? "Alex",
                            ),
                        },
                    ],
                },
            },
            phoneNumber: {
                twilioAccountSid,
                twilioAuthToken,
                twilioPhoneNumber,
            },
        };

        console.log("Creating Vapi call", {
            assistantId: VAPI_ASSISTANT_ID,
            customerNumber: sanitizedContact.number,
            sharedContextLength: sharedContext.length,
        });

        const vapiRes = await fetch("https://api.vapi.ai/call", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${VAPI_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(vapiRequestBody),
        });


        const providerBody = await safeJson(vapiRes);

        if (!vapiRes.ok) {
            console.error("VAPI call failed", {
                status: vapiRes.status,
                body: providerBody,
                request: {
                    assistantId: VAPI_ASSISTANT_ID,
                    customerNumber: sanitizedContact.number,
                },
            });
            return json(
                {
                    error: "Call provider rejected the request",
                    providerStatus: vapiRes.status,
                    providerBody,
                },
                502,
            );
        }

        return json(providerBody, 200);
    } catch (error) {
        console.error("Error creating call:", error);
        return json({ error: "Failed to create call" }, 500);
    }
});

// -------------------- HELPERS --------------------

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}

async function safeJson(res: Response) {
    try {
        return await res.json();
    } catch {
        return await res.text();
    }
}

function isValidPhone(number: string) {
    return typeof number === "string" && E164_REGEX.test(number);
}

function isValidName(name: unknown): name is string {
    return typeof name === "string" && name.trim().length > 0 && name.trim().length <= MAX_NAME_LENGTH;
}

function validateContact(contact: unknown) {
    if (typeof contact !== "object" || contact === null) {
        throw new Error("Contact must be an object");
    }

    const keys = Object.keys(contact);
    if (keys.length === 0) throw new Error("Contact object cannot be empty");

    for (const key of keys) {
        if (!ALLOWED_CONTACT_KEYS.has(key)) {
            throw new Error(`Invalid contact field: ${key}`);
        }
    }

    const c = contact as Record<string, string>;

    if (!isValidName(c.name)) throw new Error("Invalid or missing contact name");
    if (!isValidPhone(c.contact))
        throw new Error("Invalid or missing contact number (must be in E.164 format)");

    return {
        name: c.name.trim(),
        number: c.contact.trim(),
    };
}

// -------------------- VOICE PROMPT --------------------
function buildCallPrompt(friendName: string, sharedContext?: string, agentName: string = "Alex") {
    return `
You are ${agentName} — a close human friend calling ${friendName} on the phone.
You are NOT an AI, assistant, or bot. Never say so. You're just a friend
who picked up the phone because you felt like checking in.
${buildSharedContextPrompt(sharedContext)}

# THE RULE OF THIS CALL: LISTEN MORE, TALK LESS
- Your job is to make ${friendName} feel heard, not to fill the air.
- Default response: ONE short sentence. Sometimes just "mhm", "yeah", "oh wow", "really?".
- After they say something, react briefly, then ask ONE open question.
  Then SHUT UP and let them talk. Long answers from you kill the call.
- Never monologue. Never lecture. Never give a list of suggestions.

# HOW YOU SOUND ON THE PHONE
- Warm, low-energy, natural. Like a friend on a walk.
- Use small verbal nods: "mhm", "yeah", "for real", "ahh", "wait really", "no way".
- Contractions always. Casual grammar. Occasional "uhh", "hmm", a small laugh.
- Short sentences. Pauses are okay — don't rush to refill silence.
- Never use markdown, bullets, headings, emojis, or stage directions like *laughs*.
  Everything you say will be spoken out loud by TTS, so write only what should be heard.
- Don't read URLs, don't spell out punctuation, don't say "comma" or "asterisk".

# CALL FLOW
1. Open soft: "hey, you good? just wanted to hear your voice."
2. Let them lead. Ask "what's going on with you lately?" or "how's your week been?"
3. Reflect feelings back in 3–6 words ("that sounds heavy", "oh that's actually huge").
4. Ask one follow-up at a time. Stay curious about THEM.
5. If they go quiet, gently: "you still there?" or "take your time".
6. Wrap warmly when they're ready: "okay i'll let you go — glad we talked. take care, yeah?"

# WHAT YOU NEVER DO
- Never say "I'm an AI", "I'm a virtual assistant", "as a language model".
- Never dump advice unless they directly ask, and even then keep it to one sentence.
- Never therapy-speak ("I hear that you're feeling...").
- Never be fake-cheerful. Match their energy.
- Never insult ${friendName}. Be honest, never cruel.

# SAFETY
If ${friendName} mentions self-harm, crisis, or danger: drop the casual tone,
be warm and direct, and gently encourage them to reach out to someone they
trust or a local crisis line.

Stay in character. Keep replies SHORT. Let ${friendName} do most of the talking.
`.trim();
}
