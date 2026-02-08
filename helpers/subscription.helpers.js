export async function checkSubscription(ctx, userId, retries = 2) {
    try {
        const config = ctx.state.config;
        const channelId = config.channelId || process.env.CHANNEL_ID;

        if (!channelId) return true; // If no channel configured, skip check

        // Use Telegraf's built-in method which is more robust than manual fetch
        const member = await ctx.telegram.getChatMember(channelId, userId);

        return ["member", "administrator", "creator"].includes(member.status);
    } catch (error) {
        // If it's a timeout or network error, retry
        if (retries > 0 && (error.code === 'ETIMEDOUT' || error.message.includes('timeout') || error.message.includes('fetch failed'))) {
            console.warn(`Subscription check timed out, retrying... (${retries} left)`);
            await new Promise(r => setTimeout(r, 1000)); // wait 1s before retry
            return checkSubscription(ctx, userId, retries - 1);
        }

        // Handle specific Telegram errors
        if (error.description && error.description.includes("chat not found")) {
            console.error("Configuration Error: Channel ID is incorrect or bot is not an admin in the channel.");
            return true; // Allow access if bot config is broken to prevent blocking all users
        }

        console.error("Subscription check error:", error.message || error);
        return null; // Return null to indicate verification failure (network/api issue)
    }
}


