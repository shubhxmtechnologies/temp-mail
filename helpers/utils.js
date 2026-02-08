export function escapeHTML(str = "") {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

export async function safeExecute(fn) {
    try {
        return await fn();
    } catch (error) {
        if (error.description && (
            error.description.includes("bot was blocked by the user") || 
            error.description.includes("user is deactivated") ||
            error.description.includes("chat not found")
        )) {
            return null;
        }
        
        // Handle Flood Area (Rate Limiting)
        if (error.parameters && error.parameters.retry_after) {
            const retryAfter = error.parameters.retry_after;
            console.warn(`Flood control: waiting for ${retryAfter} seconds`);
            await new Promise(r => setTimeout(r, retryAfter * 1000));
            return await safeExecute(fn); // Retry
        }

        console.error("Execution Error:", error.message || error);
        return null; // Return null instead of throwing to prevent crashing the whole bot
    }
}

/**
 * Tries to edit a message, falls back to replying if editing fails.
 * @param {Context} ctx Telegraf context
 * @param {string} text Message text
 * @param {object} extra Extra parameters (reply_markup, parse_mode, etc.)
 */
export async function editOrReply(ctx, text, extra = {}) {
    try {
        if (ctx.callbackQuery && ctx.callbackQuery.message) {
            return await ctx.editMessageText(text, extra);
        }
        return await ctx.reply(text, extra);
    } catch (error) {
        // If edit fails (e.g. message not found, or not modified), try replying
        try {
            return await ctx.reply(text, extra);
        } catch (replyError) {
            console.error("Both edit and reply failed:", replyError.message);
            return null;
        }
    }
}
