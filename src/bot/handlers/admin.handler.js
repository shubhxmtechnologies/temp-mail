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

const activeBroadcasts = new Set();

export function registerAdminHandlers(bot) {
    // Command
    bot.command('admin', async (ctx) => {
        if (!await isAdmin(ctx.from.id)) return;
        await clearAdminState(ctx.from.id); // Clear any pending state
        await safeExecute(() => ctx.reply("👮‍♂️ <b>Admin Dashboard</b>", {
            parse_mode: 'HTML',
            reply_markup: getAdminDashboardKeyboard()
        }));
    });

    // Actions
    bot.action("admin_menu", async (ctx) => {
        await ctx.answerCbQuery().catch(() => { });
        if (!await isAdmin(ctx.from.id)) return;
        await clearAdminState(ctx.from.id);
        const text = "👮‍♂️ <b>Admin Dashboard</b>";
        await editOrReply(ctx, text, {
            parse_mode: 'HTML',
            reply_markup: getAdminDashboardKeyboard()
        });
    });

    bot.action("stop_broadcast", async (ctx) => {
        await ctx.answerCbQuery("🛑 Stopping broadcast...").catch(() => { });
        activeBroadcasts.delete(ctx.from.id);
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
        const config = await getBotConfig();
        let text = `⚙️ <b>Settings</b>\n`;
        text += `🆔 <b>Channel ID:</b> ${escapeHTML(config.channelId || 'Not Set')}\n`;
        text += `🔗 <b>Link:</b> ${escapeHTML(config.channelLink || 'Not Set')}\n`;
        text += `👨‍💻 <b>Dev Contact:</b> ${escapeHTML(config.developerContact)}`;
        await editOrReply(ctx, text, { parse_mode: 'HTML', reply_markup: getAdminSettingsKeyboard() });
    });

    bot.action("admin_admins", async (ctx) => {
        await ctx.answerCbQuery().catch(() => { });
        if (!await isAdmin(ctx.from.id)) return;
        const config = await getBotConfig();
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
        if (ctx.message.text?.startsWith('/')) {
            await clearAdminState(userId);
            return next();
        }

        const state = await getAdminState(userId);
        if (!state) return next();

        if (state.step === 'broadcast_msg') {
            if (activeBroadcasts.has(userId)) {
                return await ctx.reply("⚠️ A broadcast is already in progress. Please wait for it to finish or stop it first.");
            }
            await clearAdminState(userId).catch(() => {});
            activeBroadcasts.add(userId);
            const users = await getAllUsers();
            const statusMsg = await ctx.reply(`⏳ Sending broadcast to ${users.length} users...`, {
                reply_markup: { inline_keyboard: [[{ text: "🛑 Stop Broadcast", callback_data: "stop_broadcast" }]] }
            });

            let sent = 0, blocked = 0;
            for (let i = 0; i < users.length; i++) {
                if (!activeBroadcasts.has(userId)) break;
                const user = users[i];
                const res = await safeExecute(() => ctx.copyMessage(user.telegramId));
                if (res) sent++; else blocked++;
                
                if (i % 20 === 0) {
                    try {
                        await ctx.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, null, 
                            `⏳ Broadcasting: ${sent + blocked}/${users.length}\n✅ Sent: ${sent}\n🚫 Blocked: ${blocked}`,
                            { reply_markup: { inline_keyboard: [[{ text: "🛑 Stop Broadcast", callback_data: "stop_broadcast" }]] } }
                        );
                    } catch (_) {}
                }
                // Throttle to stay within Telegram limits (~30 msgs/sec for bots)
                await new Promise(r => setTimeout(r, 60));
            }
            activeBroadcasts.delete(userId);
            return await safeExecute(() => ctx.reply(`✅ Broadcast Complete!\n📨 Sent: ${sent}\n🚫 Failed: ${blocked}`));
        }

        if (state.step === 'forward_msg') {
            if (activeBroadcasts.has(userId)) {
                return await ctx.reply("⚠️ A broadcast is already in progress. Please wait for it to finish or stop it first.");
            }
            await clearAdminState(userId).catch(() => {});
            activeBroadcasts.add(userId);
            const users = await getAllUsers();
            const statusMsg = await ctx.reply(`⏳ Forwarding to ${users.length} users...`, {
                reply_markup: { inline_keyboard: [[{ text: "🛑 Stop Broadcast", callback_data: "stop_broadcast" }]] }
            });

            let sent = 0, blocked = 0;
            for (let i = 0; i < users.length; i++) {
                if (!activeBroadcasts.has(userId)) break;
                const user = users[i];
                const res = await safeExecute(() => ctx.forwardMessage(user.telegramId));
                if (res) sent++; else blocked++;

                if (i % 20 === 0) {
                    try {
                        await ctx.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, null, 
                            `⏳ Forwarding: ${sent + blocked}/${users.length}\n✅ Sent: ${sent}\n🚫 Blocked: ${blocked}`,
                            { reply_markup: { inline_keyboard: [[{ text: "🛑 Stop Broadcast", callback_data: "stop_broadcast" }]] } }
                        );
                    } catch (_) {}
                }
                await new Promise(r => setTimeout(r, 60));
            }
            activeBroadcasts.delete(userId);
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