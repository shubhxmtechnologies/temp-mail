import { getMailMenuKeyboard, getStartKeyboard } from "../keyboards.js";
import mailManager from "../../../config/mail.config.js";
import { checkSubscription } from "../../../helpers/subscription.helpers.js";
import fs from 'fs';

export function registerUserHandlers(bot) {
    bot.start(async (ctx) => {
        const { id } = ctx.from;
        const config = ctx.state.config;

        // Fresh subscription check
        const subscribed = await checkSubscription(id);
        const currentMail = await mailManager.getUserMail(id);
        const hasMail = !!currentMail;

        let welcomeText = `🚀 <b>Welcome to Temp Mail Bot!</b>\n\n`;
        welcomeText += `Generate high-quality temporary emails to protect your privacy and avoid spam.\n\n`;
        welcomeText += `<b>✨ Features:</b>\n`;
        welcomeText += `• 📧 <b>Instant Email:</b> Generate in one tap.\n`;
        welcomeText += `• 📥 <b>Live Inbox:</b> Receive OTPs & messages.\n`;
        welcomeText += `• 🔗 <b>Smart Links:</b> One-click access to buttons.\n`;
        welcomeText += `• 🔐 <b>Secure:</b> Private sessions for every user.\n\n`;

        let keyboard;
        if (subscribed) {
            if (hasMail) {
                welcomeText += `📧 <b>Your Active Mail:</b>\n<code>${currentMail.username}</code>\n\n`;
            } else {
                welcomeText += `👇 <b>Click below to get started!</b>`;
            }
            keyboard = {
                reply_markup: getMailMenuKeyboard(hasMail, config.developerContact)
            };
        } else {
            welcomeText += `❌ <b>You must join our channel to use this bot!</b>\n\n`;
            welcomeText += `Please join the channel and click the button below to continue.`;
            keyboard = {
                reply_markup: getStartKeyboard(config.channelLink)
            };
        }

        const options = {
            caption: welcomeText,
            parse_mode: 'HTML',
            ...keyboard
        };

        const photoPath = './public/pic_of_bot.webp';
        if (fs.existsSync(photoPath)) {
            await ctx.replyWithPhoto({ source: photoPath }, options);
        } else {
            await ctx.replyWithHTML(welcomeText, keyboard);
        }
    });

    bot.action("check_join", async (ctx) => {
        const userId = ctx.from.id;
        const config = ctx.state.config;

        const subscribed = await checkSubscription(userId);
        if (!subscribed) {
            return ctx.answerCbQuery("❌ Still not joined! Please join and try again.", { show_alert: true });
        }

        const currentMail = await mailManager.getUserMail(userId);
        const hasMail = !!currentMail;

        let text = "✅ <b>Success!</b> You have joined the channel.\n\nChoose an option to continue:";

        if (hasMail) {
            text = `📧 <b>Your Active Mail:</b>\n\n<code>${currentMail.username}</code>\n\nClick refresh to check for incoming messages.`;
        }

        await ctx.deleteMessage().catch(() => { });
        await ctx.reply(
            text,
            {
                parse_mode: 'HTML',
                reply_markup: getMailMenuKeyboard(hasMail, config.developerContact)
            }
        );
    });
}
