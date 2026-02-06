import { checkSubscription } from '../../../helpers/subscription.helpers.js';
import { getBotConfig, getAdminState } from '../../../helpers/admin.helpers.js';
import { getStartKeyboard } from '../keyboards.js';

export async function accessMiddleware(ctx, next) {
    if (ctx.message?.text === '/start' ||
        ctx.callbackQuery?.data === 'check_join' ||
        ctx.message?.text === '/admin') {
        return next();
    }

    const userId = ctx.from?.id;
    if (!userId) return;

    // Check if user is in an admin state (persistent)
    const state = await getAdminState(userId);
    if (state) {
        return next();
    }

    const subscribed = await checkSubscription(userId);
    const config = await getBotConfig();

    if (!subscribed) {
        const message = "❌ You must join our channel to use this bot!";
        const keyboard = { reply_markup: getStartKeyboard(config.channelLink) };

        if (ctx.callbackQuery) {
            await ctx.answerCbQuery("❌ Channel join required!", { show_alert: true });
            try {
                return await ctx.editMessageText(message, keyboard);
            } catch (e) {
                return await ctx.reply(message, keyboard);
            }
        }
        return ctx.reply(message, keyboard);
    }

    return next();
}