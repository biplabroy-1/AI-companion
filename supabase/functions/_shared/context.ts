type MessageLike = {
    role?: string;
    sender?: string;
    content: string;
};

const MAX_HISTORY_MESSAGES = 12;
const MAX_SNIPPET_LENGTH = 220;
const MAX_CONTEXT_LENGTH = 1600;

function trimText(value: string, limit = MAX_SNIPPET_LENGTH) {
    const normalized = value.replace(/\s+/g, " ").trim();
    if (normalized.length <= limit) return normalized;
    return `${normalized.slice(0, limit - 1).trimEnd()}…`;
}

function labelForMessage(message: MessageLike) {
    if (message.role === "system") return "system";
    if (message.role === "assistant" || message.sender === "ai") return "assistant";
    if (message.role === "user" || message.sender === "user") return "user";
    return message.role || message.sender || "message";
}

export function formatMessageHistory(messages: MessageLike[], limit = MAX_HISTORY_MESSAGES) {
    return messages
        .slice(-limit)
        .map((message) => `${labelForMessage(message)}: ${trimText(message.content)}`)
        .join("\n");
}

export function buildSharedContextSummary(options: {
    source: "chat" | "call";
    existingContext?: string | null;
    recentMessages: MessageLike[];
    companionName: string;
    personality?: string;
    currentMood?: string;
    note?: string;
}) {
    const sections: string[] = [];

    if (options.existingContext?.trim()) {
        sections.push(`prior shared context:\n${trimText(options.existingContext, 700)}`);
    }

    sections.push(`latest ${options.source} context for ${options.companionName}:`);

    if (options.personality || options.currentMood) {
        sections.push(
            `persona: ${[options.personality, options.currentMood].filter(Boolean).join(" | ")}`,
        );
    }

    const history = formatMessageHistory(options.recentMessages);
    if (history) {
        sections.push(history);
    }

    if (options.note?.trim()) {
        sections.push(`note: ${trimText(options.note, 300)}`);
    }

    return trimText(sections.join("\n"), MAX_CONTEXT_LENGTH);
}

export function buildSharedContextPrompt(sharedContext?: string | null) {
    const trimmed = sharedContext?.trim();
    if (!trimmed) return "";

    return `\n# SHARED CONTEXT\n${trimmed}\n`;
}