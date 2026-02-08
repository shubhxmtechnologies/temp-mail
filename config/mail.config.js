import Mailjs from "@cemalgnlts/mailjs";
import { MailSession } from "./db.cofig.js";

class TelegramMailManager {
    constructor() {
        this.mailjs = new Mailjs();
        // Start the auto-cleanup task every 1 minute
        setInterval(() => this.autoCleanup(), 60 * 1000);
    }

    // 1. Generate Mail for a specific user
    async generateMail(telegramId) {
        try {
            const acc = await this.mailjs.createOneAccount();
            if (acc.status) {
                // Save this specific account to MongoDB
                await MailSession.findOneAndUpdate(
                    { telegramId },
                    { account: acc.data },
                    { upsert: true, new: true }
                );
                return acc.data;
            }
            return null;
        } catch (error) {
            console.error(`Error for generate mail : `, error);
            return null;
        }
    }

    // 2. Refresh for a specific user
    async refresh(telegramId) {
        try {
            const session = await MailSession.findOne({ telegramId });
            if (!session) return null;

            const { username, password } = session.account;
            // We must login first because the VPS instance might have lost the token
            await this.mailjs.login(username, password);
            return await this.mailjs.getMessages();
        } catch (error) {
            console.error(`Error in refresh for ${telegramId}:`, error.message);
            return null;
        }
    }

    // 2.5 Get a specific message
    async getMessage(telegramId, messageId) {
        try {
            const session = await MailSession.findOne({ telegramId });
            if (!session) return null;

            const { username, password } = session.account;
            await this.mailjs.login(username, password);
            return await this.mailjs.getMessage(messageId);
        } catch (error) {
            console.error(`Error in getMessage for ${telegramId}:`, error.message);
            return null;
        }
    }

    // 3. Delete Mail for a specific user
    async deleteMail(telegramId) {
        try {
            const session = await MailSession.findOne({ telegramId });
            if (!session) return true; // Already gone

            const { username, password } = session.account;
            try {
                await this.mailjs.login(username, password);
                await this.mailjs.deleteMe();
            } catch (err) {
                console.warn(`Server side delete failed for ${telegramId}, likely already gone.`, err.message);
            }

            await MailSession.deleteOne({ telegramId }); // Always remove from MongoDB if user requested delete
            return true;
        } catch (error) {
            console.error(`Error for delete mail : `, error);
            return false;
        }
    }

    // 4. Check if a specific user has a mail
    async hasActiveMail(telegramId) {
        const count = await MailSession.countDocuments({ telegramId });
        return count > 0;
    }

    // 5. Get existing mail details
    async getUserMail(telegramId) {
        const session = await MailSession.findOne({ telegramId });
        return session ? session.account : null;
    }

    // New: Cleanup session from DB if login fails or session expired
    async cleanupSession(telegramId) {
        await MailSession.deleteOne({ telegramId });
    }

    async autoCleanup() {
        try {
            // Find sessions older than 10 minutes
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
            const expiredSessions = await MailSession.find({
                createdAt: { $lt: tenMinutesAgo }
            });

            if (expiredSessions.length === 0) return;

            console.log(`[Cleanup] Found ${expiredSessions.length} expired sessions.`);

            for (const session of expiredSessions) {
                console.log(`[Cleanup] Deleting session for User: ${session.telegramId}`);
                // Use your existing deleteMail logic to clean both DB and Mail Server
                await this.deleteMail(session.telegramId);
            }
        } catch (error) {
            console.error("Error during auto-cleanup:", error);
        }
    }
}

const mailManager = new TelegramMailManager();


export default mailManager;