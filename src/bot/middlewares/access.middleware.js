import { checkSubscription } from '../../../helpers/subscription.helpers.js';
import { getBotConfig, } from '../../../helpers/admin.helpers.js';
import { saveToDb } from '../../../helpers/db.helpers.js';
import { getStartKeyboard } from '../keyboards.js';

const denyCooldown = new Map();
const DENY_COOLDOWN_MS = 3000;
const lastDenyMessage = new Map();
export async function accessMiddleware(ctx, next) {
    const userId = ctx.from?.id;
    if (!userId) return;

    // 1. Attach bot Config to State
    const config = await getBotConfig();
    ctx.state.config = config;

    // 2. Save/Update User on /start
    if (ctx.message?.text === '/start') {
        const { id, username, first_name, last_name } = ctx.from;
        const fullName = `${first_name}${last_name ? " " + last_name : ""}`;
        saveToDb(id, username, fullName).catch(err => console.error("error in save to db at middleware", err));

        return next(); // Always allow /start to show welcome message
    }

    // 3. Always allow check_join to let the handler verify subscription
    if (ctx.callbackQuery?.data === 'check_join') {
        return next();
    }

    // 4. Check Subscription for EVERYONE else (including admins)
    const subscribed = await checkSubscription(ctx, userId);
    if (subscribed === null) {
        try {
            if (ctx.callbackQuery) {
                return ctx.answerCbQuery(
                    "⚠️ Network issue.\nPlease check your internet and try again.",
                    { show_alert: true }
                );
            }
            return ctx.reply(
                "⚠️ Unable to verify subscription right now.\nPlease check your internet and try again."
            );
        } catch (_) {
            return;
        }
    }
    if (subscribed == false) {

        const now = Date.now();
        const lastTime = denyCooldown.get(userId);

        if (lastTime && now - lastTime < DENY_COOLDOWN_MS) {
            return; // ignore spam
        }

        denyCooldown.set(userId, now);
        const message =
            "❌ <b>Access Denied!</b>\n\nYou must join our channel to use this bot. Click the button below to join, then click 'I Joined'.";

        const keyboard = {
            parse_mode: 'HTML',
            reply_markup: getStartKeyboard(config.channelLink)
        };

        // 1️⃣ show popup (if possible)
        try {
            if (ctx.callbackQuery) {
                await ctx.answerCbQuery("❌ Channel join required!", { show_alert: true });
            }
        } catch (err) {
            console.error('answerCbQuery failed:', err);
        }

        // 2️⃣ always try to send a NEW message
        try {
            const sent = await ctx.reply(message, keyboard);

            // delete old denial message if exists
            const oldMsgId = lastDenyMessage.get(userId);
            if (oldMsgId) {
                try {
                    await ctx.telegram.deleteMessage(ctx.chat.id, oldMsgId);
                } catch (_) { }
            }

            lastDenyMessage.set(userId, sent.message_id);
            return;
        } catch (err) {
            console.error('reply failed:', err);
            return;
        }
    }

    denyCooldown.delete(userId);
    lastDenyMessage.delete(userId);
    return next();
}