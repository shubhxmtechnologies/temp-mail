import { saveToDb } from "../../../helpers/db.helpers.js";
import { checkSubscription } from "../../../helpers/subscription.helpers.js";
import { getBotConfig } from "../../../helpers/admin.helpers.js";
import { getStartKeyboard, getMailMenuKeyboard } from "../keyboards.js";
import mailManager from "../../../config/mail.config.js";

export function registerUserHandlers(bot) {
    bot.start(async (ctx) => {

        if (!ctx.from) return;
        const { id, username, first_name, last_name } = ctx.from;
        const fullName = `${first_name}${last_name ? " " + last_name : ""}`;

        const [, subscribed] = await Promise.all([
            saveToDb(id, username, fullName),
            checkSubscription(id),
        ]);

        const config = await getBotConfig();

        if (!subscribed) {
            return ctx.reply(
                "❌ You must join our channel to use this bot",
                { reply_markup: getStartKeyboard(config.channelLink) }
            );
        }

        const hasMail = await mailManager.hasActiveMail(id);
        let text = "✅ Welcome! Choose an option:";
        
        if (hasMail) {
            const currentMail = await mailManager.getUserMail(id);
            text = `📧 <b>Your Active Mail:</b>\n\n<code>${currentMail.username}</code>\n\nClick refresh to check for incoming messages.`;
        }

        ctx.replyWithHTML(
            text,
            {
                reply_markup: getMailMenuKeyboard(hasMail, config.developerContact)
            }
        );
    });

    bot.action("check_join", async (ctx) => {
        const userId = ctx.from.id;
        const subscribed = await checkSubscription(userId);
        const config = await getBotConfig();

        if (!subscribed) {
            return ctx.answerCbQuery("❌ Still not joined!", { show_alert: true });
        }

        const hasMail = await mailManager.hasActiveMail(userId);
        let text = "✅ Thanks for joining! Choose an option:";

        if (hasMail) {
            const currentMail = await mailManager.getUserMail(userId);
            text = `📧 <b>Your Active Mail:</b>\n\n<code>${currentMail.username}</code>\n\nClick refresh to check for incoming messages.`;
        }

        await ctx.editMessageText(
            text,
            {
                parse_mode: 'HTML',
                reply_markup: getMailMenuKeyboard(hasMail, config.developerContact)
            }
        );
    });
}
