const BOT_TOKEN = process.env.BOT_TOKEN;

export async function checkSubscription(ctx, userId) {
    try {
        const config = ctx.state.config
        const channelId = config.channelId || process.env.CHANNEL_ID;

        if (!channelId) return true; // If no channel configured, skip check

        const response = await fetch(
            `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember` +
            `?chat_id=${channelId}&user_id=${userId}`,
            { timeout: 8000 }
        );

        const data = await response.json();
        if (!data.ok) {
            console.error("Telegram API error:", data);
            return null;
        }

        return ["member", "administrator", "creator"].includes(
            data.result.status
        );
    } catch (error) {
        console.error("Subscription check error:", error);
        return null;
    }
}


