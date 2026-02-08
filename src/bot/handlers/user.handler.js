import { getMailMenuKeyboard, getStartKeyboard } from "../keyboards.js";
import mailManager from "../../../config/mail.config.js";
import { checkSubscription } from "../../../helpers/subscription.helpers.js";
import fs from 'fs';

export function registerUserHandlers(bot) {
    bot.start(async (ctx) => {
        const { id } = ctx.from;
        // bot configurations
        const config = ctx.state.config;


        // welcome message 
        let welcomeText = `🚀 <b>Welcome to Temp Mail Bot!</b>\n\n`;
        welcomeText += `Generate high-quality temporary emails to protect your privacy and avoid spam.\n\n`;
        welcomeText += `<b>✨ Features:</b>\n`;
        welcomeText += `• 📧 <b>Instant Email:</b> Generate in one tap.\n`;
        welcomeText += `• 📥 <b>Live Inbox:</b> Receive OTPs & messages.\n`;
        welcomeText += `• 🔗 <b>Smart Links:</b> One-click access to buttons.\n`;
        welcomeText += `• 🔐 <b>Secure:</b> Private sessions for every user.\n\n`;


        const photoPath = './public/pic_of_bot.webp';
        if (fs.existsSync(photoPath)) {
            await ctx.replyWithPhoto({ source: photoPath }, {
                caption: welcomeText,
                parse_mode: 'HTML'
            });
        } else {
            await ctx.replyWithHTML(welcomeText);
        }


        // Fresh subscription and mail check
        let subscribed = false;
        let currentMail = null;
        try {
            [subscribed, currentMail] = await Promise.all([
                checkSubscription(ctx, id),
                mailManager.getUserMail(id)
            ]);
        } catch (_) {
            // fail-safe: bot still responds
        }
        const hasMail = !!currentMail;

        // second message to send after /start command 
        let secondMsg;

        if (subscribed === null) {
            secondMsg = "⚠️ <b>Network issue</b>\n\nUnable to verify channel subscription right now.\nPlease check your internet and try again.";
        } else if (subscribed === true) {
            secondMsg = hasMail
                ? `📧 <b>You already have an active mail:</b>\n<code>${currentMail.username}</code>`
                : `👇 <b>Click below to get started!</b>`;
        } else {
            secondMsg = `❌ <b>You must join our channel to use this bot!</b>\n\nPlease join the channel and click the button below to continue.`;
        }

        const reply_markup = subscribed
            ? getMailMenuKeyboard(hasMail, config.developerContact)
            : getStartKeyboard(config.channelLink);

        await ctx.replyWithHTML(secondMsg, {
            reply_markup
        });

    });

    bot.action("check_join", async (ctx) => {
        try {
            const userId = ctx.from.id;
            // bot configurations
            const config = ctx.state.config;

            //  stop spinner immediately 
            await ctx.answerCbQuery();


            let subscribed = false;
            let currentMail = null;
            try {
                [subscribed, currentMail] = await Promise.all([
                    checkSubscription(ctx, userId),
                    mailManager.getUserMail(userId)
                ]);
            } catch (_) {
                // fail-safe: 
            }

            // user still not subscribed → show popup and stop
            if (subscribed === null) {
                return ctx.answerCbQuery(
                    "⚠️ Network issue. Please try again in a moment.",
                    { show_alert: true }
                );
            }

            if (subscribed === false) {
                return ctx.answerCbQuery(
                    "❌ Still not joined! Please join and try again.",
                    { show_alert: true }
                );
            }


            const hasMail = !!currentMail;

            const text = hasMail
                ? `📧 <b>You have an active Mail :</b>\n\n<code>${currentMail.username}</code>\n\nClick refresh to check for incoming messages.`
                : `✅ <b>Success!</b> You have joined the channel.\n\nChoose an option to continue:`;


            if (ctx.callbackQuery?.message) {
                try {
                    await ctx.deleteMessage();
                } catch (_) { }
            }


            // send new menu 
            return await ctx.reply(text, {
                parse_mode: 'HTML',
                reply_markup: getMailMenuKeyboard(hasMail, config.developerContact)
            });

        } catch (err) {
            console.error("Error in check_join action:", err.message);
        }
    });
}
