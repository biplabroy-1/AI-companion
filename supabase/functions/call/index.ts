import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
        } catch (err) {
            return json({ error: err.message }, 400);
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

        const vapiRes = await fetch("https://api.vapi.ai/call", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${VAPI_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                assistantId: VAPI_ASSISTANT_ID,
                phoneNumber: {
                    twilioAccountSid,
                    twilioAuthToken,
                    twilioPhoneNumber,
                },
                customer: sanitizedContact,
                assistantOverrides: {
                    firstMessage: `hey ${sanitizedContact.name}, it's me. you got a sec?`,
                    model: {
                        messages: [
                            { role: "system", content: buildCallPrompt(sanitizedContact.name) },
                        ],
                    },
                },
            }),
        });


        const providerBody = await safeJson(vapiRes);

        if (!vapiRes.ok) {
            console.error("VAPI call failed", { status: vapiRes.status, body: providerBody });
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
