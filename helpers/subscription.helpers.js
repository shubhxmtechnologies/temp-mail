const BOT_TOKEN = process.env.BOT_TOKEN;
import { getBotConfig } from "./admin.helpers.js";

export async function checkSubscription(userId) {
    try {
        const config = await getBotConfig();
        const channelId = config.channelId || process.env.CHANNEL_ID;

        if (!channelId) return true; // If no channel configured, skip check

        const response = await fetch(
            `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember` +
            `?chat_id=${channelId}&user_id=${userId}`
        );

        const data = await response.json();
        if (!data.ok) {
            console.error("Telegram API error:", data);
            // If channel is invalid or bot is not admin there, fail open or closed?
            // Usually fail closed (return false) but let's log it.
            return false;
        }

        return ["member", "administrator", "creator"].includes(
            data.result.status
        );
    } catch (error) {
        console.error("Subscription check error:", error);
        return false;
    }
}


