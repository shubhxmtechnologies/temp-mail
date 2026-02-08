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
        const errMsg = error.message || String(error);

        // Handle common Telegram errors that aren't "bugs"
        if (errMsg.includes("bot was blocked by the user") || 
            errMsg.includes("user is deactivated") ||
            errMsg.includes("chat not found")
        ) {
            return null;
        }
        
        // Handle Flood Area (Rate Limiting)
        if (error.parameters && error.parameters.retry_after) {
            const retryAfter = error.parameters.retry_after;
            console.warn(`Flood control: waiting for ${retryAfter} seconds`);
            await new Promise(r => setTimeout(r, retryAfter * 1000));
            return await safeExecute(fn); // Retry
        }

        // Handle Network Timeouts / Fetch Failures
        if (errMsg.includes("timeout") || errMsg.includes("fetch failed") || errMsg.includes("UND_ERR_CONNECT_TIMEOUT")) {
            console.error("Network Timeout Error: api.telegram.org is unreachable. Please check your VPS internet/proxy.");
            return null;
        }

        // Sanitize sensitive info from logs (e.g. MongoDB connection strings)
        let sanitizedMsg = errMsg;
        if (sanitizedMsg.includes("mongodb+srv://")) {
            sanitizedMsg = "MongoDB Connection Error (Credentials Masked)";
        }

        console.error("Execution Error:", sanitizedMsg);
        return null;
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
