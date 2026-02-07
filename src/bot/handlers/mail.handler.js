import mailManager from "../../../config/mail.config.js";
import { getBotConfig } from "../../../helpers/admin.helpers.js";
import {
    getMailMenuKeyboard,
    getInboxKeyboard,
    getMessageViewKeyboard
} from "../keyboards.js";

export function registerMailHandlers(bot) {
    // Generate Mail
    bot.action("gen", async (ctx) => {
        const userId = ctx.from.id;
        const config = await getBotConfig();

        if (await mailManager.hasActiveMail(userId)) {
            const currentMail = await mailManager.getUserMail(userId);
            const check = await mailManager.refresh(userId);

            if (check && check.status) {
                return ctx.replyWithHTML(`⚠️ You already have an active mail:

📧 <code>${currentMail.username}</code>

Please use it or delete it first.
Copy mail by clicking on the mail.`, {
                    reply_markup: getMailMenuKeyboard(true, config.developerContact)
                });
            } else {
                await mailManager.cleanupSession(userId);
            }
        }

        const newMail = await mailManager.generateMail(userId);
        if (newMail) {
            const text = `✅ New Email Generated:

📧 <code>${newMail.username}</code>

Click refresh to check for incoming messages.
Copy mail by clicking on the mail.`;
            try {
                await ctx.editMessageText(text, {
                    parse_mode: 'HTML',
                    reply_markup: getMailMenuKeyboard(true, config.developerContact)
                });
            } catch (error) {
                ctx.replyWithHTML(text, {
                    reply_markup: getMailMenuKeyboard(true, config.developerContact)
                });
            }
        } else {
            ctx.reply("❌ Failed to generate mail. Please try again later.");
        }
    });

    // Refresh Inbox
    bot.action("refresh", async (ctx) => {
        const userId = ctx.from.id;
        const config = await getBotConfig();

        if (!(await mailManager.hasActiveMail(userId))) {
            try {
                return await ctx.editMessageText("❌ No active mail found. Please generate one.", {
                    reply_markup: getMailMenuKeyboard(false, config.developerContact)
                });
            } catch (error) {
                return ctx.answerCbQuery("No active mail found.");
            }
        }

        try {
            const res = await mailManager.refresh(userId);

            if (res && res.status && res.data) {
                const inbox = res.data["hydra:member"] || (Array.isArray(res.data) ? res.data : []);

                if (inbox.length === 0) {
                    return ctx.answerCbQuery("📭 Inbox is empty. Check back in a moment!", { show_alert: true });
                }

                const msgText = "📬 <b>Your Inbox:</b> Select a message to read its content:";
                try {
                    await ctx.editMessageText(msgText, {
                        parse_mode: 'HTML',
                        reply_markup: getInboxKeyboard(inbox)
                    });
                } catch (error) {
                    await ctx.replyWithHTML(msgText, { reply_markup: getInboxKeyboard(inbox) });
                }
            } else {
                throw new Error("Session Lost");
            }
        } catch (error) {
            await mailManager.cleanupSession(userId);
            try {
                await ctx.editMessageText("⚠️ Session expired. Please generate a new one.", {
                    reply_markup: getMailMenuKeyboard(false, config.developerContact)
                });
            } catch (e) {
                ctx.answerCbQuery("Session expired.");
            }
        }
    });

    // View Message
    bot.action(/^view_msg_(.+)$/, async (ctx) => {
        const userId = ctx.from.id;
        const msgId = ctx.match[1];

        try {
            const res = await mailManager.getMessage(userId, msgId);
            if (res && res.status && res.data) {
                const m = res.data;
                let htmlContent = Array.isArray(m.html) ? m.html.join('') : (m.html || "");
                let rawBody = m.text || m.intro || "";
                const actionButtons = [];

                if (!rawBody && htmlContent) {
                    const linkRegex = /<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*>(.*?)<\/a>/gi;
                    let match;
                    while ((match = linkRegex.exec(htmlContent)) !== null) {
                        let url = match[1];
                        let text = match[2].replace(/<[^>]*>?/gm, '').trim();
                        if (text.length > 2 && url.startsWith('http')) {
                            actionButtons.push({ text: text.substring(0, 30), url: url });
                        }
                    }
                    rawBody = htmlContent
                        .replace(/<style([\s\S]*?)<\/style>/gi, '')
                        .replace(/<br\s*\/?>/gi, '\n')
                        .replace(/<p[^>]*>/gi, '\n')
                        .replace(/<[^>]*>?/gm, '')
                        .replace(/&nbsp;/g, ' ')
                        .replace(/\n\s*\n+/g, '\n\n')
                        .trim();
                }

                let displayMsg = `📬 <b>Message Details:</b>

`;
                displayMsg += `<b>From:</b> ${m.from.address}
`;
                displayMsg += `<b>Subject:</b> ${m.subject || '(No Subject)'}
`;
                displayMsg += `<b>Date:</b> ${new Date(m.createdAt).toLocaleString()}

`;
                displayMsg += `<b>Content:</b>
${rawBody || "No content available."}`;

                if (displayMsg.length > 4000) displayMsg = displayMsg.substring(0, 3997) + "...";

                await ctx.editMessageText(displayMsg, {
                    parse_mode: 'HTML',
                    disable_web_page_preview: true,
                    reply_markup: getMessageViewKeyboard(actionButtons)
                });
            } else {
                ctx.answerCbQuery("❌ Could not fetch message content.");
            }
        } catch (error) {
            console.error("View Message Error:", error);
            ctx.answerCbQuery("❌ Error fetching message.");
        }
    });

    // Mail Menu (Back Button)
    bot.action("mail_menu", async (ctx) => {
        const userId = ctx.from.id;
        const config = await getBotConfig();

        if (!(await mailManager.hasActiveMail(userId))) {
            return ctx.editMessageText("❌ No active mail found.", {
                reply_markup: getMailMenuKeyboard(false, config.developerContact)
            });
        }

        const currentMail = await mailManager.getUserMail(userId);
        await ctx.editMessageText(`📧 <b>Your Active Mail:</b>

<code>${currentMail.username}</code>

Click refresh to check for incoming messages.`, {
            parse_mode: 'HTML',
            reply_markup: getMailMenuKeyboard(true, config.developerContact)
        });
    });

    // Delete Mail
    bot.action("delete_mail", async (ctx) => {
        const userId = ctx.from.id;
        const config = await getBotConfig();
        await mailManager.deleteMail(userId);

        try {
            await ctx.editMessageText("🗑️ Email deleted successfully. Need a new one?", {
                reply_markup: getMailMenuKeyboard(false, config.developerContact)
            });
        } catch (error) {
            ctx.answerCbQuery("🗑️ Deleted!");
        }
    });

    // Change Mail
    bot.action("change_mail", async (ctx) => {
        const userId = ctx.from.id;
        const config = await getBotConfig();
        await mailManager.deleteMail(userId);

        const newMail = await mailManager.generateMail(userId);
        if (newMail) {
            const text = `🔄 Mail Changed!

📧 <code>${newMail.username}</code>

Copy mail by clicking on the mail.`;
            try {
                await ctx.editMessageText(text, {
                    parse_mode: 'HTML',
                    reply_markup: getMailMenuKeyboard(true, config.developerContact)
                });
            } catch (error) {
                ctx.replyWithHTML(text, {
                    reply_markup: getMailMenuKeyboard(true, config.developerContact)
                });
            }
        } else {
            ctx.answerCbQuery("❌ Failed to generate new mail.", { show_alert: true });
        }
    });
}