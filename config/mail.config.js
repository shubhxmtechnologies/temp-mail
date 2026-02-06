import Mailjs from "@cemalgnlts/mailjs";
import { MailSession } from "./db.cofig.js";

class TelegramMailManager {
    constructor() {
        this.mailjs = new Mailjs();
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
        const session = await MailSession.findOne({ telegramId });
        if (!session) return null;

        const { username, password } = session.account;
        // We must login first because the VPS instance might have lost the token
        await this.mailjs.login(username, password);
        return await this.mailjs.getMessages();
    }

    // 2.5 Get a specific message
    async getMessage(telegramId, messageId) {
        const session = await MailSession.findOne({ telegramId });
        if (!session) return null;

        const { username, password } = session.account;
        await this.mailjs.login(username, password);
        return await this.mailjs.getMessage(messageId);
    }

    // 3. Delete Mail for a specific user
    async deleteMail(telegramId) {
        const session = await MailSession.findOne({ telegramId });
        if (!session) return false;

        const { username, password } = session.account;
        await this.mailjs.login(username, password);
        const res = await this.mailjs.deleteMe();

        if (res.status) {
            await MailSession.deleteOne({ telegramId }); // Remove from MongoDB
            return true;
        }
        return false;
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
}

const mailManager = new TelegramMailManager();


export default mailManager;