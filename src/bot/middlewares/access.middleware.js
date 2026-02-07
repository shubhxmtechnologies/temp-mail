import { checkSubscription } from '../../../helpers/subscription.helpers.js';
import { getBotConfig, getAdminState, isAdmin } from '../../../helpers/admin.helpers.js';
import { saveToDb } from '../../../helpers/db.helpers.js';
import { getStartKeyboard } from '../keyboards.js';

export async function accessMiddleware(ctx, next) {
    const userId = ctx.from?.id;
    if (!userId) return;

    // 1. Attach Config to State
    const config = await getBotConfig();
    ctx.state.config = config;

    // 2. Save/Update User on /start
    if (ctx.message?.text === '/start') {
        const { id, username, first_name, last_name } = ctx.from;
        const fullName = `${first_name}${last_name ? " " + last_name : ""}`;
        await saveToDb(id, username, fullName);
        return next(); // Always allow /start to show welcome message
    }

    // 3. Always allow check_join to let the handler verify subscription
    if (ctx.callbackQuery?.data === 'check_join') {
        return next();
    }

    // 4. Check Subscription for EVERYONE else (including admins)
    const subscribed = await checkSubscription(userId);

    if (!subscribed) {
        const message = "❌ <b>Access Denied!</b>\n\nYou must join our channel to use this bot. Click the button below to join, then click 'I Joined'.";
        const keyboard = { 
            parse_mode: 'HTML',
            reply_markup: getStartKeyboard(config.channelLink) 
        };

        if (ctx.callbackQuery) {
            await ctx.answerCbQuery("❌ Channel join required!", { show_alert: true });
            try {
                return await ctx.editMessageText(message, keyboard);
            } catch (e) {
                return;
            }
        }
        return ctx.reply(message, keyboard);
    }

    return next();
}