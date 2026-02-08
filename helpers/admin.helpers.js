import { BotConfig, User, AdminState } from "../config/db.cofig.js";

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

let cachedConfig = null;
let lastFetch = 0;
const CACHE_TTL = 60 * 1000; // 1 minute cache

export async function getBotConfig() {
    const now = Date.now();
    if (cachedConfig && (now - lastFetch < CACHE_TTL)) {
        return cachedConfig;
    }
    const config = await BotConfig.findOne().lean() || {};
    cachedConfig = config;
    lastFetch = now;
    return config;
}

export async function addAdmin(adminId) {
    const config = await BotConfig.findOne();
    if (config) {
        if (!config.admins.includes(adminId)) {
            config.admins.push(adminId);
            await config.save();
            cachedConfig = null; // Invalidate cache
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
        cachedConfig = null; // Invalidate cache
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
        cachedConfig = null; // Invalidate cache
        return true;
    }
    return false;
}

export async function updateDeveloperContact(contact) {
    const config = await BotConfig.findOne();
    if (config) {
        config.developerContact = "tg://user?id=" + contact;
        await config.save();
        cachedConfig = null; // Invalidate cache
        return true;
    }
    return false;
}

export async function isAdmin(userId) {
    const config = await getBotConfig();
    return config && config.admins && config.admins.includes(userId);
}

export async function getAllUsers() {
    return await User.find({}, { telegramId: 1 }).lean();
}

export async function getUserCount() {
    return await User.countDocuments();
}

export async function setAdminState(telegramId, state) {
    await AdminState.findOneAndUpdate(
        { telegramId },
        { state },
        { upsert: true, new: true }
    );
}

export async function getAdminState(telegramId) {
    const data = await AdminState.findOne({ telegramId }).lean();
    return data ? data.state : null;
}

export async function clearAdminState(telegramId) {
    await AdminState.deleteOne({ telegramId });
}