import {
    isAdmin,
    getUserCount,
    getAllUsers,
    updateChannelInfo,
    updateDeveloperContact,
    addAdmin,
    removeAdmin,
    setAdminState,
    getAdminState,
    clearAdminState
} from "../../../helpers/admin.helpers.js";
import {
    getAdminDashboardKeyboard,
    getAdminSettingsKeyboard,
    getAdminManageKeyboard,
    getCancelKeyboard
} from "../keyboards.js";
import { escapeHTML, safeExecute, editOrReply } from "../../../helpers/utils.js";

export function registerAdminHandlers(bot) {
    // Command
    bot.command('admin', async (ctx) => {
        if (!await isAdmin(ctx.from.id)) return;
        await safeExecute(() => ctx.reply("👮‍♂️ <b>Admin Dashboard</b>", {
            parse_mode: 'HTML',
            reply_markup: getAdminDashboardKeyboard()
        }));
    });

    // Actions
    bot.action("admin_menu", async (ctx) => {
        await ctx.answerCbQuery().catch(() => { });
        if (!await isAdmin(ctx.from.id)) return;
        const text = "👮‍♂️ <b>Admin Dashboard</b>";
        await editOrReply(ctx, text, {
            parse_mode: 'HTML',
            reply_markup: getAdminDashboardKeyboard()
        });
    });

    bot.action("admin_stats", async (ctx) => {
        await ctx.answerCbQuery().catch(() => { });
        if (!await isAdmin(ctx.from.id)) return;
        const count = await getUserCount();
        const text = `📊 <b>Bot Statistics</b>\n            👥 Total Users: <b>${count}</b>`;
        await editOrReply(ctx, text, {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_menu" }]] }
        });
    });

    bot.action("admin_broadcast", async (ctx) => {
        await ctx.answerCbQuery().catch(() => { });
        if (!await isAdmin(ctx.from.id)) return;
        await setAdminState(ctx.from.id, { step: 'broadcast_msg' });
        const text = "📢 <b>Broadcast</b> Send the message (Text, Photo, or Caption) you want to broadcast to all users.";
        await editOrReply(ctx, text, {
            parse_mode: 'HTML',
            reply_markup: getCancelKeyboard()
        });
    });

    bot.action("admin_forward", async (ctx) => {
        await ctx.answerCbQuery().catch(() => { });
        if (!await isAdmin(ctx.from.id)) return;
        await setAdminState(ctx.from.id, { step: 'forward_msg' });
        const text = "⏩ <b>Forward Post</b> Forward the message from your channel that you want to send to all users.";
        await editOrReply(ctx, text, {
            parse_mode: 'HTML',
            reply_markup: getCancelKeyboard()
        });
    });

    bot.action("admin_settings", async (ctx) => {
        await ctx.answerCbQuery().catch(() => { });
        if (!await isAdmin(ctx.from.id)) return;
        const config = ctx.state.config;
        let text = `⚙️ <b>Settings</b>\n`;
        text += `🆔 <b>Channel ID:</b> ${escapeHTML(config.channelId || 'Not Set')}\n`;
        text += `🔗 <b>Link:</b> ${escapeHTML(config.channelLink || 'Not Set')}\n`;
        text += `👨‍💻 <b>Dev Contact:</b> ${escapeHTML(config.developerContact)}`;
        await editOrReply(ctx, text, { parse_mode: 'HTML', reply_markup: getAdminSettingsKeyboard() });
    });

    bot.action("admin_admins", async (ctx) => {
        await ctx.answerCbQuery().catch(() => { });
        if (!await isAdmin(ctx.from.id)) return;
        const config = ctx.state.config;
        let text = `👥 <b>Manage Admins</b>\n\nCurrent Admins:\n`;
        (config.admins || []).forEach(id => text += `<code>${escapeHTML(id)}</code>\n`);
        await editOrReply(ctx, text, { parse_mode: 'HTML', reply_markup: getAdminManageKeyboard() });
    });

    bot.action("admin_set_channel_id", async (ctx) => {
        await ctx.answerCbQuery().catch(() => { });
        await setAdminState(ctx.from.id, { step: 'set_channel_id' });
        await safeExecute(() => ctx.reply("Send the new Channel ID by sending only numeric id of channel:", { reply_markup: getCancelKeyboard() }));
    });

    bot.action("admin_set_channel_link", async (ctx) => {
        await ctx.answerCbQuery().catch(() => { });
        await setAdminState(ctx.from.id, { step: 'set_channel_link' });
        await safeExecute(() => ctx.reply("Send the new Channel Invite username of your channel with @ ex: sk_genz:", { reply_markup: getCancelKeyboard() }));
    });

    bot.action("admin_set_dev", async (ctx) => {
        await ctx.answerCbQuery().catch(() => { });
        await setAdminState(ctx.from.id, { step: 'set_dev' });
        await safeExecute(() => ctx.reply("Send the new Developer Contact numeric id only :", { reply_markup: getCancelKeyboard() }));
    });

    bot.action("admin_add_admin", async (ctx) => {
        await ctx.answerCbQuery().catch(() => { });
        await setAdminState(ctx.from.id, { step: 'add_admin' });
        await safeExecute(() => ctx.reply("Send the Telegram ID of the new admin:", { reply_markup: getCancelKeyboard() }));
    });

    bot.action("admin_remove_admin", async (ctx) => {
        await ctx.answerCbQuery().catch(() => { });
        await setAdminState(ctx.from.id, { step: 'remove_admin' });
        await safeExecute(() => ctx.reply("Send the Telegram ID of the admin to remove:", { reply_markup: getCancelKeyboard() }));
    });

    bot.action("admin_cancel_state", async (ctx) => {
        await ctx.answerCbQuery().catch(() => { });
        await clearAdminState(ctx.from.id);
        await safeExecute(() => ctx.reply("❌ Action cancelled.", {
            reply_markup: { inline_keyboard: [[{ text: "🔙 Dashboard", callback_data: "admin_menu" }]] }
        }));
    });

    bot.action("admin_close", async (ctx) => {
        await ctx.answerCbQuery().catch(() => { });
        ctx.deleteMessage().catch(() => { });
    });

    // Message Logic for Admin States
    bot.on("message", async (ctx, next) => {
        const userId = ctx.from.id;
        const state = await getAdminState(userId);
        if (!state) return next();

        if (state.step === 'broadcast_msg') {
            await clearAdminState(userId).catch()
            const users = await getAllUsers();
            await safeExecute(() => ctx.reply(`⏳ Sending broadcast to ${users.length} users...`));
            let sent = 0, blocked = 0;
            for (const user of users) {
                const res = await safeExecute(() => ctx.copyMessage(user.telegramId));
                if (res) sent++; else blocked++;
                await new Promise(r => setTimeout(r, 50));
            }
            return await safeExecute(() => ctx.reply(`✅ Broadcast Complete!\n                📨 Sent: ${sent}\n                🚫 Failed: ${blocked}`));
        }

        if (state.step === 'forward_msg') {
            await clearAdminState(userId);
            const users = await getAllUsers();
            await safeExecute(() => ctx.reply(`⏳ Forwarding to ${users.length} users...`));
            let sent = 0, blocked = 0;
            for (const user of users) {
                const res = await safeExecute(() => ctx.forwardMessage(user.telegramId));
                if (res) sent++; else blocked++;
                await new Promise(r => setTimeout(r, 50));
            }
            return await safeExecute(() => ctx.reply(`✅ Forward Complete!\n\n📨 Sent: ${sent}\n🚫 Failed: ${blocked}`));
        }

        if (state.step === 'set_channel_id') {
            await updateChannelInfo(ctx.message.text, null);
            await clearAdminState(userId);
            return await safeExecute(() => ctx.reply("✅ Channel ID updated!", { reply_markup: { inline_keyboard: [[{ text: "🔙 Dashboard", callback_data: "admin_menu" }]] } }));
        }

        if (state.step === 'set_channel_link') {
            await updateChannelInfo(null, ctx.message.text);
            await clearAdminState(userId);
            return await safeExecute(() => ctx.reply("✅ Channel Link updated!", { reply_markup: { inline_keyboard: [[{ text: "🔙 Dashboard", callback_data: "admin_menu" }]] } }));
        }

        if (state.step === 'set_dev') {
            await updateDeveloperContact(ctx.message.text);
            await clearAdminState(userId);
            return await safeExecute(() => ctx.reply("✅ Dev Contact updated!", { reply_markup: { inline_keyboard: [[{ text: "🔙 Dashboard", callback_data: "admin_menu" }]] } }));
        }

        if (state.step === 'add_admin') {
            const newId = parseInt(ctx.message.text);
            if (!isNaN(newId)) await addAdmin(newId);
            await clearAdminState(userId);
            return await safeExecute(() => ctx.reply(`Done.`, { reply_markup: { inline_keyboard: [[{ text: "🔙 Dashboard", callback_data: "admin_menu" }]] } }));
        }

        if (state.step === 'remove_admin') {
            const rmId = parseInt(ctx.message.text);
            if (!isNaN(rmId)) await removeAdmin(rmId);
            await clearAdminState(userId);
            return await safeExecute(() => ctx.reply(`Done.`, { reply_markup: { inline_keyboard: [[{ text: "🔙 Dashboard", callback_data: "admin_menu" }]] } }));
        }

        return next();
    });
}