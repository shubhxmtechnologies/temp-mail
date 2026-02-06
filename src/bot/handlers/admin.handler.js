import {
    isAdmin,
    getUserCount,
    getAllUsers,
    updateChannelInfo,
    updateDeveloperContact,
    addAdmin,
    removeAdmin,
    getBotConfig,
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

export function registerAdminHandlers(bot) {
    // Command
    bot.command('admin', async (ctx) => {
        if (!await isAdmin(ctx.from.id)) return;
        ctx.reply("👮‍♂️ <b>Admin Dashboard</b>", {
            parse_mode: 'HTML',
            reply_markup: getAdminDashboardKeyboard()
        });
    });

    // Actions
    bot.action("admin_menu", async (ctx) => {
        if (!await isAdmin(ctx.from.id)) return;
        try {
            await ctx.editMessageText("👮‍♂️ <b>Admin Dashboard</b>", {
                parse_mode: 'HTML',
                reply_markup: getAdminDashboardKeyboard()
            });
        } catch (e) {
            ctx.reply("👮‍♂️ <b>Admin Dashboard</b>", {
                parse_mode: 'HTML',
                reply_markup: getAdminDashboardKeyboard()
            });
        }
    });

    bot.action("admin_stats", async (ctx) => {
        if (!await isAdmin(ctx.from.id)) return;
        const count = await getUserCount();
        await ctx.editMessageText(`📊 <b>Bot Statistics</b>

👥 Total Users: <b>${count}</b>`, {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_menu" }]] }
        });
    });

    bot.action("admin_broadcast", async (ctx) => {
        if (!await isAdmin(ctx.from.id)) return;
        await setAdminState(ctx.from.id, { step: 'broadcast_msg' });
        await ctx.editMessageText("📢 <b>Broadcast</b> Send the message (Text, Photo, or Caption) you want to broadcast to all users.", {
            parse_mode: 'HTML',
            reply_markup: getCancelKeyboard()
        });
    });

    bot.action("admin_forward", async (ctx) => {
        if (!await isAdmin(ctx.from.id)) return;
        await setAdminState(ctx.from.id, { step: 'forward_msg' });
        await ctx.editMessageText("⏩ <b>Forward Post</b> Forward the message from your channel that you want to send to all users.", {
            parse_mode: 'HTML',
            reply_markup: getCancelKeyboard()
        });
    });

    bot.action("admin_settings", async (ctx) => {
        if (!await isAdmin(ctx.from.id)) return;
        const config = await getBotConfig();
        let text = `⚙️ <b>Settings</b>\n`;
        text += `🆔 <b>Channel ID:</b> ${config.channelId || 'Not Set'}\n`;
        text += `🔗 <b>Link:</b> ${config.channelLink || 'Not Set'}\n`;
        text += `👨‍💻 <b>Dev Contact:</b> ${config.developerContact}`;
        await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: getAdminSettingsKeyboard() });
    });

    bot.action("admin_admins", async (ctx) => {
        if (!await isAdmin(ctx.from.id)) return;
        const config = await getBotConfig();
        let text = `👥 <b>Manage Admins</b> \n        Current Admins:`;
        (config.admins || []).forEach(id => text += `<code>${id}</code>`);
        await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: getAdminManageKeyboard() });
    });

    bot.action("admin_set_channel_id", async (ctx) => {
        await setAdminState(ctx.from.id, { step: 'set_channel_id' });
        ctx.reply("Send the new Channel ID by sending only numeric id of channel:", { reply_markup: getCancelKeyboard() });
    });

    bot.action("admin_set_channel_link", async (ctx) => {
        await setAdminState(ctx.from.id, { step: 'set_channel_link' });
        ctx.reply("Send the new Channel Invite username of your channel with @ ex: sk_genz:", { reply_markup: getCancelKeyboard() });
    });

    bot.action("admin_set_dev", async (ctx) => {
        await setAdminState(ctx.from.id, { step: 'set_dev' });
        ctx.reply("Send the new Developer Contact numeric id only :", { reply_markup: getCancelKeyboard() });
    });

    bot.action("admin_add_admin", async (ctx) => {
        await setAdminState(ctx.from.id, { step: 'add_admin' });
        ctx.reply("Send the Telegram ID of the new admin:", { reply_markup: getCancelKeyboard() });
    });

    bot.action("admin_remove_admin", async (ctx) => {
        await setAdminState(ctx.from.id, { step: 'remove_admin' });
        ctx.reply("Send the Telegram ID of the admin to remove:", { reply_markup: getCancelKeyboard() });
    });

    bot.action("admin_cancel_state", async (ctx) => {
        await clearAdminState(ctx.from.id);
        ctx.reply("❌ Action cancelled.", {
            reply_markup: { inline_keyboard: [[{ text: "🔙 Dashboard", callback_data: "admin_menu" }]] }
        });
    });

    bot.action("admin_close", (ctx) => ctx.deleteMessage());

    // Message Logic for Admin States
    bot.on("message", async (ctx, next) => {
        const userId = ctx.from.id;
        const state = await getAdminState(userId);
        if (!state) return next();

        if (state.step === 'broadcast_msg') {
            await clearAdminState(userId);
            const users = await getAllUsers();
            ctx.reply(`⏳ Sending broadcast to ${users.length} users...`);
            let sent = 0, blocked = 0;
            for (const user of users) {
                try {
                    await ctx.copyMessage(user.telegramId);
                    sent++;
                } catch (e) {
                    blocked++;
                }
                await new Promise(r => setTimeout(r, 50));
            }
            return ctx.reply(`✅ Broadcast Complete!
                📨 Sent: ${sent}
                🚫 Failed: ${blocked}`
            );
        }

        if (state.step === 'forward_msg') {
            await clearAdminState(userId);
            const users = await getAllUsers();
            ctx.reply(`⏳ Forwarding to ${users.length} users...`);
            let sent = 0, blocked = 0;
            for (const user of users) {
                try { await ctx.forwardMessage(user.telegramId); sent++; } catch (e) { blocked++; }
                await new Promise(r => setTimeout(r, 50));
            }
            return ctx.reply(`✅ Forward Complete!

📨 Sent: ${sent}
🚫 Failed: ${blocked}`);
        }

        if (state.step === 'set_channel_id') {
            await updateChannelInfo(ctx.message.text, null);
            await clearAdminState(userId);
            return ctx.reply("✅ Channel ID updated!", { reply_markup: { inline_keyboard: [[{ text: "🔙 Dashboard", callback_data: "admin_menu" }]] } });
        }

        if (state.step === 'set_channel_link') {
            await updateChannelInfo(null, ctx.message.text);
            await clearAdminState(userId);
            return ctx.reply("✅ Channel Link updated!", { reply_markup: { inline_keyboard: [[{ text: "🔙 Dashboard", callback_data: "admin_menu" }]] } });
        }

        if (state.step === 'set_dev') {
            await updateDeveloperContact(ctx.message.text);
            await clearAdminState(userId);
            return ctx.reply("✅ Dev Contact updated!", { reply_markup: { inline_keyboard: [[{ text: "🔙 Dashboard", callback_data: "admin_menu" }]] } });
        }

        if (state.step === 'add_admin') {
            const newId = parseInt(ctx.message.text);
            if (!isNaN(newId)) await addAdmin(newId);
            await clearAdminState(userId);
            return ctx.reply(`Done.`, { reply_markup: { inline_keyboard: [[{ text: "🔙 Dashboard", callback_data: "admin_menu" }]] } });
        }

        if (state.step === 'remove_admin') {
            const rmId = parseInt(ctx.message.text);
            if (!isNaN(rmId)) await removeAdmin(rmId);
            await clearAdminState(userId);
            return ctx.reply(`Done.`, { reply_markup: { inline_keyboard: [[{ text: "🔙 Dashboard", callback_data: "admin_menu" }]] } });
        }

        return next();
    });
}