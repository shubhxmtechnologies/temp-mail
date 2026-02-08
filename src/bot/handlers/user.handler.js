import { getMailMenuKeyboard, getStartKeyboard } from "../keyboards.js";
import mailManager from "../../../config/mail.config.js";
import { checkSubscription } from "../../../helpers/subscription.helpers.js";
import fs from 'fs';
import { escapeHTML, safeExecute, editOrReply } from "../../../helpers/utils.js";

export function registerUserHandlers(bot) {
    bot.start(async (ctx) => {
        const { id } = ctx.from;
        const config = ctx.state.config;

        // 1. Welcome message first
        let welcomeText = `🚀 <b>Welcome to Temp Mail Bot!</b>\n\n`;
        welcomeText += `Generate high-quality temporary emails to protect your privacy and avoid spam.\n\n`;
        welcomeText += `<b>✨ Features:</b>\n`;
        welcomeText += `• 📧 <b>Instant Email:</b> Generate in one tap.\n`;
        welcomeText += `• 📥 <b>Live Inbox:</b> Receive OTPs & messages.\n`;
        welcomeText += `• 🔗 <b>Smart Links:</b> One-click access to buttons.\n`;
        welcomeText += `• 🔐 <b>Secure:</b> Private sessions for every user.\n\n`;

        const photoPath = './public/pic_of_bot.webp';
        if (fs.existsSync(photoPath)) {
            await safeExecute(() => ctx.replyWithPhoto({ source: photoPath }, {
                caption: welcomeText,
                parse_mode: 'HTML'
            }));
        } else {
            await safeExecute(() => ctx.replyWithHTML(welcomeText));
        }

        // 2. Fetch data (Subscription & Mail)
        let subscribed = false;
        let currentMail = null;
        try {
            // Sequential to ensure stability, or use safe values
            subscribed = await checkSubscription(ctx, id);
            if (subscribed) {
                currentMail = await mailManager.getUserMail(id);
            }
        } catch (_) { }

        const hasMail = !!currentMail;
        let secondMsg;

        if (subscribed === null) {
            secondMsg = "⚠️ <b>Network issue</b>\n\nUnable to verify channel subscription right now.\nPlease check your internet and try again.";
        } else if (subscribed === true) {
            secondMsg = hasMail
                ? `📧 <b>You already have an active mail:</b>\n<code>${escapeHTML(currentMail.username)}</code>`
                : `👇 <b>Click below to get started!</b>`;
        } else {
            secondMsg = `❌ <b>You must join our channel to use this bot!</b>\n\nPlease join the channel and click the button below to continue.`;
        }

        const reply_markup = subscribed
            ? getMailMenuKeyboard(hasMail, config.developerContact)
            : getStartKeyboard(config.channelLink);

        await safeExecute(() => ctx.replyWithHTML(secondMsg, { reply_markup }));
    });

    bot.action("check_join", async (ctx) => {
        try {
            const userId = ctx.from.id;
            const config = ctx.state.config;

            // 1. Fetch data in parallel first (No answer yet, so spinner stays active)
            let subscribed = false;
            let currentMail = null;
            try {
                [subscribed, currentMail] = await Promise.all([
                    checkSubscription(ctx, userId),
                    mailManager.getUserMail(userId)
                ]);
            } catch (err) {
                console.error("Error in check_join parallel fetch:", err.message);
            }

            // 2. Handle Subscription states with ALERTS
            if (subscribed === null) {
                return await ctx.answerCbQuery(
                    "⚠️ Network issue. Please try again in a moment.",
                    { show_alert: true }
                ).catch(() => { });
            }

            if (subscribed === false) {
                return await ctx.answerCbQuery(
                    "❌ Still not joined! Please join and try again.",
                    { show_alert: true }
                ).catch(() => { });
            }

            // 3. Success -> Answer without alert (stops spinner)
            await ctx.answerCbQuery().catch(() => { });

            const hasMail = !!currentMail;
            const text = hasMail
                ? `📧 <b>You have an active Mail :</b>\n\n<code>${escapeHTML(currentMail.username)}</code>\n\nClick refresh to check for incoming messages.`
                : `✅ <b>Success!</b> You have joined the channel.\n\nChoose an option to continue:`;

            if (ctx.callbackQuery?.message) {
                try {
                    await ctx.deleteMessage();
                } catch (_) { }
            }

            // send new menu 
            return await safeExecute(() => ctx.reply(text, {
                parse_mode: 'HTML',
                reply_markup: getMailMenuKeyboard(hasMail, config.developerContact)
            }));

        } catch (err) {
            console.error("Error in check_join action:", err.message);
            // Emergency stop for the spinner if something crashed
            await ctx.answerCbQuery("❌ Internal error. Try again.").catch(() => { });
        }
    });
}
