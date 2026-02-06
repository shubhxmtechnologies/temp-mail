import Mailjs from "@cemalgnlts/mailjs";

class TelegramMailManager {
    constructor() {
        this.mailjs = new Mailjs();
        // Use a Map to store accounts: Key = Telegram User ID, Value = Account Data
        this.userSessions = new Map();
    }

    // 1. Generate Mail for a specific user
    async generateMail(telegramId) {
        try {
            const acc = await this.mailjs.createOneAccount();
            if (acc.status) {
                // Save this specific account to this Telegram ID
                this.userSessions.set(telegramId, acc.data);
                return acc.data;
            }
            return null;
        } catch (error) {
            console.error(`Error for genereate mail : `, error);
            return null;
        }
    }

    // 2. Refresh for a specific user
    async refresh(telegramId) {
        const session = this.userSessions.get(telegramId);
        if (!session) return null;

        // We must login first because the VPS instance might have lost the token
        await this.mailjs.login(session.username, session.password);
        return await this.mailjs.getMessages();
    }

    // 2.5 Get a specific message
    async getMessage(telegramId, messageId) {
        const session = this.userSessions.get(telegramId);
        if (!session) return null;

        await this.mailjs.login(session.username, session.password);
        return await this.mailjs.getMessage(messageId);
    }

    // 3. Delete Mail for a specific user
    async deleteMail(telegramId) {
        const session = this.userSessions.get(telegramId);
        if (!session) return false;

        await this.mailjs.login(session.username, session.password);
        const res = await this.mailjs.deleteMe();

        if (res.status) {
            this.userSessions.delete(telegramId); // Remove from VPS memory
            return true;
        }
        return false;
    }

    // 4. Check if a specific user has a mail
    hasActiveMail(telegramId) {
        return this.userSessions.has(telegramId);
    }

    // 5. Get existing mail details
    getUserMail(telegramId) {
        return this.userSessions.get(telegramId);
    }
}

const mailManager = new TelegramMailManager();


export default mailManager;

