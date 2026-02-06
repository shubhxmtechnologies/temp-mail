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

        const hasMail = mailManager.hasActiveMail(id);
        ctx.reply(
            "✅ Welcome! Choose an option:",
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

        const hasMail = mailManager.hasActiveMail(userId);
        await ctx.editMessageText(
            "✅ Thanks for joining! Choose an option:",
            {
                reply_markup: getMailMenuKeyboard(hasMail, config.developerContact)
            }
        );
    });
}
