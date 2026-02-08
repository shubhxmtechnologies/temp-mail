import Mailjs from "@cemalgnlts/mailjs";
import { MailSession } from "./db.cofig.js";

class TelegramMailManager {
    constructor() {
        this.sessionCache = new Map(); // Cache login tokens
        // Start the auto-cleanup task every 1 minute
        setInterval(() => this.autoCleanup(), 60 * 1000);
    }

    /**
     * Creates a fresh authenticated Mailjs instance for the user.
     */
    async _getAuthInstance(telegramId, username, password) {
        const mailjs = new Mailjs();
        const cached = this.sessionCache.get(telegramId);
        
        if (cached && cached.username === username) {
            mailjs.token = cached.token;
            mailjs.id = cached.id;
            return mailjs;
        }

        const login = await mailjs.login(username, password);
        if (login && login.status) {
            this.sessionCache.set(telegramId, {
                username,
                token: mailjs.token,
                id: mailjs.id
            });
            return mailjs;
        }
        return null;
    }

    // 1. Generate Mail for a specific user
    async generateMail(telegramId) {
        try {
            const mailjs = new Mailjs();
            const acc = await mailjs.createOneAccount();
            if (acc.status) {
                // Save this specific account to MongoDB
                await MailSession.findOneAndUpdate(
                    { telegramId },
                    { account: acc.data },
                    { upsert: true, new: true }
                );
                // Update session cache
                this.sessionCache.set(telegramId, {
                    username: acc.data.username,
                    token: mailjs.token,
                    id: mailjs.id
                });
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
            const session = await MailSession.findOne({ telegramId }).lean();
            if (!session) return null;

            const { username, password } = session.account;
            const mailjs = await this._getAuthInstance(telegramId, username, password);
            if (mailjs) {
                return await mailjs.getMessages();
            }
            return null;
        } catch (error) {
            console.error(`Error in refresh for :`, error.message);
            return null;
        }
    }

    // 2.5 Get a specific message
    async getMessage(telegramId, messageId) {
        try {
            const session = await MailSession.findOne({ telegramId }).lean();
            if (!session) return null;

            const { username, password } = session.account;
            const mailjs = await this._getAuthInstance(telegramId, username, password);
            if (mailjs) {
                return await mailjs.getMessage(messageId);
            }
            return null;
        } catch (error) {
            console.error(`Error in getMessage for :`, error.message);
            return null;
        }
    }

    // 3. Delete Mail for a specific user
    async deleteMail(telegramId) {
        try {
            const session = await MailSession.findOne({ telegramId }).lean();
            if (!session) return true; // Already gone

            const { username, password } = session.account;
            try {
                const mailjs = await this._getAuthInstance(telegramId, username, password);
                if (mailjs) {
                    await mailjs.deleteMe();
                }
            } catch (err) {
                console.warn(`Server side delete failed for , likely already gone.`, err.message);
            }

            await MailSession.deleteOne({ telegramId }); // Always remove from MongoDB if user requested delete
            this.sessionCache.delete(telegramId);
            return true;
        } catch (error) {
            console.error(`Error for delete mail : `, error);
            return false;
        }
    }

    // 4. Check if a specific user has a mail
    async hasActiveMail(telegramId) {
        const mail = await this.getUserMail(telegramId);
        return !!mail;
    }

    // 5. Get existing mail details
    async getUserMail(telegramId) {
        const session = await MailSession.findOne({ telegramId }).lean();
        if (!session) return null;

        const { username, password } = session.account;
        try {
            const mailjs = await this._getAuthInstance(telegramId, username, password);
            if (mailjs) {
                return session.account;
            } else {
                await this.cleanupSession(telegramId);
                return null;
            }
        } catch (error) {
            console.error(`Error verifying mail for :`, error.message);
            return session.account;
        }
    }

    // New: Cleanup session from DB if login fails or session expired
    async cleanupSession(telegramId) {
        await MailSession.deleteOne({ telegramId });
        this.sessionCache.delete(telegramId);
    }

    async autoCleanup() {
        try {
            // Find sessions older than 20 minutes
            const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);
            const expiredSessions = await MailSession.find({
                createdAt: { $lt: twentyMinutesAgo }
            });

            if (expiredSessions.length === 0) return;

            console.log(`[Cleanup] Found expired sessions.`);

            for (const session of expiredSessions) {
                await this.deleteMail(session.telegramId);
            }
        } catch (error) {
            console.error("Error during auto-cleanup:", error);
        }
    }
}

const mailManager = new TelegramMailManager();


export default mailManager;