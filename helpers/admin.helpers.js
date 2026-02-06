import { BotConfig, User } from "../config/db.cofig.js";

// Ensure config exists (call this at startup)
export async function initBotConfig(initialAdminId) {
    const config = await BotConfig.findOne();
    if (!config) {
        // Create default config
        await BotConfig.create({
            admins: initialAdminId ? [initialAdminId] : [],
            channelId: process.env.CHANNEL_ID || "",
            channelLink: process.env.CHANNEL_LINK || "",
            developerContact: "tg://user?id=" + process.env.ADMIN_ID
        });
        console.log("✅ Bot Config initialized");
    }
}

export async function getBotConfig() {
    return await BotConfig.findOne() || {};
}

export async function addAdmin(adminId) {
    const config = await BotConfig.findOne();
    if (config) {
        if (!config.admins.includes(adminId)) {
            config.admins.push(adminId);
            await config.save();
            return true;
        }
    }
    return false;
}

export async function removeAdmin(adminId) {
    const config = await BotConfig.findOne();
    if (config) {
        config.admins = config.admins.filter(id => id !== adminId);
        await config.save();
        return true;
    }
    return false;
}

export async function updateChannelInfo(channelId, channelLink) {
    const config = await BotConfig.findOne();
    if (config) {
        if (channelId) config.channelId = channelId;
        if (channelLink) config.channelLink = channelLink;
        await config.save();
        return true;
    }
    return false;
}

export async function updateDeveloperContact(contact) {
    const config = await BotConfig.findOne();
    if (config) {
        config.developerContact = "tg://user?id=" + contact;
        await config.save();
        return true;
    }
    return false;
}

export async function isAdmin(userId) {
    const config = await BotConfig.findOne();
    return config && config.admins.includes(userId);
}

export async function getAllUsers() {
    return await User.find({}, { telegramId: 1 });
}

export async function getUserCount() {
    return await User.countDocuments();
}
