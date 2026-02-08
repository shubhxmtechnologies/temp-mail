import mailManager from "../../../config/mail.config.js";
import {
    getMailMenuKeyboard,
    getInboxKeyboard,
    getMessageViewKeyboard
} from "../keyboards.js";

export function registerMailHandlers(bot) {
    // Generate Mail
    bot.action("gen", async (ctx) => {
        const userId = ctx.from.id;
        const config = ctx.state.config;

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
        const config = ctx.state.config

        if (!(await mailManager.hasActiveMail(userId))) {
            try {
                return await ctx.editMessageText("❌ This Mail is not active. Please generate one.", {
                    reply_markup: getMailMenuKeyboard(false, config.developerContact)
                });
            } catch (error) {
                return await ctx.reply(
                    "❌ This Mail is not active. Please generate one.",
                    {
                        reply_markup: getMailMenuKeyboard(false, config.developerContact)
                    }
                );
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
                try {
                    await ctx.reply("Server Bussy Please Try Again Later")
                } catch (_) { }
                throw new Error("Session Lost");
            }
        } catch (error) {
            await mailManager.cleanupSession(userId);
            try {
                await ctx.editMessageText("⚠️ Session expired. Please generate a new one.", {
                    reply_markup: getMailMenuKeyboard(false, config.developerContact)
                });
            } catch (e) {
                await ctx.reply(
                    "⚠️ Session expired. Please generate a new one.",
                    {
                        reply_markup: getMailMenuKeyboard(false, config.developerContact)
                    }
                );
            }
        }
    });

    function escapeHTML(str = "") {
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }
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

                    rawBody = ""
                    const seenUrls = new Set();

                    while ((match = linkRegex.exec(htmlContent)) !== null) {
                        let url = match[1];
                        let text = match[2].replace(/<[^>]*>?/gm, '').trim();
                        const isValidUrl = /^https?:\/\//i.test(url);
                        if (!isValidUrl || text.length <= 2) continue;
                        if (seenUrls.has(url)) continue;
                        seenUrls.add(url);
                        const safeText = escapeHTML(text.substring(0, 30));
                        const safeUrl = escapeHTML(url);

                        actionButtons.push({
                            text: safeText,
                            url: url
                        });

                        rawBody += `\n<b>${safeText} 👇👇</b>\n<code>${safeUrl}</code>\n`;


                    }
                    rawBody = rawBody.trim();
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


                await ctx.reply(displayMsg, {
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
        const config = ctx.state.config

        if (!(await mailManager.hasActiveMail(userId))) {
            try {
                return ctx.editMessageText("❌ No active mail found. Generate New From Below : ", {
                    reply_markup: getMailMenuKeyboard(false, config.developerContact)
                });
            } catch (error) {
                return ctx.reply("No active mail found. Generate New From Below : ", {
                    reply_markup: getMailMenuKeyboard(false, config.developerContact)
                });
            }

        }

        const currentMail = await mailManager.getUserMail(userId);
        try {
            await ctx.editMessageText(`📧 <b>Your Active Mail:</b>

<code>${currentMail.username}</code>

Click refresh to check for incoming messages.`, {
                parse_mode: 'HTML',
                reply_markup: getMailMenuKeyboard(true, config.developerContact)
            });
        } catch (error) {
            await ctx.reply(`📧 <b>Your Active Mail:</b>

<code>${currentMail.username}</code>

Click refresh to check for incoming messages.`, {
                parse_mode: 'HTML',
                reply_markup: getMailMenuKeyboard(true, config.developerContact)
            });
        }
    });

    // Delete Mail
    bot.action("delete_mail", async (ctx) => {
        const userId = ctx.from.id;
        const config = ctx.state.config
        await mailManager.deleteMail(userId);

        try {
            await ctx.editMessageText("🗑️ Email deleted successfully. Need a new one?", {
                reply_markup: getMailMenuKeyboard(false, config.developerContact)
            });
        } catch (error) {
            await ctx.reply("🗑️ Email deleted successfully. Need a new one?", {
                reply_markup: getMailMenuKeyboard(false, config.developerContact)
            });
        }
    });

    // Change Mail
    bot.action("change_mail", async (ctx) => {
        const userId = ctx.from.id;
        const config = ctx.state.config
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