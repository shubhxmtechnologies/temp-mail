const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_USERNAME = process.env.CHANNEL_ID; 

export async function checkSubscription(userId) {
    try {
        const response = await fetch(
            `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember` +
            `?chat_id=${CHANNEL_USERNAME}&user_id=${userId}`
        );

        const data = await response.json();
        if (!data.ok) {
            console.error("Telegram API error:", data);
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


