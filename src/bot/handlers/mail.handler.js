import mailManager from "../../../config/mail.config.js";
import {
    getMailMenuKeyboard,
    getInboxKeyboard,
    getMessageViewKeyboard
} from "../keyboards.js";
import { escapeHTML, safeExecute, editOrReply } from "../../../helpers/utils.js";

export function registerMailHandlers(bot) {
    // Generate Mail
    bot.action("gen", async (ctx) => {
        await ctx.answerCbQuery().catch(() => { });
        const userId = ctx.from.id;
        const config = ctx.state.config;

        if (await mailManager.hasActiveMail(userId)) {
            const currentMail = await mailManager.getUserMail(userId);
            const check = await mailManager.refresh(userId);

            if (check && check.status) {
                const text = `⚠️ You already have an active mail:\n\n📧 <code>${escapeHTML(currentMail.username)}</code>\n\nPlease use it or delete it first.\nCopy mail by clicking on the mail.`;
                return await editOrReply(ctx, text, {
                    parse_mode: 'HTML',
                    reply_markup: getMailMenuKeyboard(true, config.developerContact)
                });
            } else {
                await mailManager.cleanupSession(userId);
            }
        }

        const newMail = await mailManager.generateMail(userId);
        if (newMail) {
            const text = `✅ New Email Generated:\n\n📧 <code>${escapeHTML(newMail.username)}</code>\n\nClick refresh to check for incoming messages.\nCopy mail by clicking on the mail.`;
            await editOrReply(ctx, text, {
                parse_mode: 'HTML',
                reply_markup: getMailMenuKeyboard(true, config.developerContact)
            });
        } else {
            await safeExecute(() => ctx.reply("❌ Failed to generate mail. Please try again later."));
        }
    });

    // Refresh Inbox
    bot.action("refresh", async (ctx) => {
        await ctx.answerCbQuery().catch(() => { });
        const userId = ctx.from.id;
        const config = ctx.state.config

        if (!(await mailManager.hasActiveMail(userId))) {
            const text = "❌ This Mail is not active. Please generate one.";
            return await editOrReply(ctx, text, {
                reply_markup: getMailMenuKeyboard(false, config.developerContact)
            });
        }

        try {
            const res = await mailManager.refresh(userId);

            if (res && res.status && res.data) {
                const inbox = res.data["hydra:member"] || (Array.isArray(res.data) ? res.data : []);

                if (inbox.length === 0) {
                    return ctx.answerCbQuery("📭 Inbox is empty. Check back in a moment!", { show_alert: true });
                }

                const msgText = "📬 <b>Your Inbox:</b> Select a message to read its content:";
                await editOrReply(ctx, msgText, {
                    parse_mode: 'HTML',
                    reply_markup: getInboxKeyboard(inbox)
                });
            } else {
                try {
                    await safeExecute(() => ctx.reply("Server Bussy Please Try Again Later"));
                } catch (_) { }
                throw new Error("Session Lost");
            }
        } catch (error) {
            await mailManager.cleanupSession(userId);
            const text = "⚠️ Session expired. Please generate a new one.";
            await editOrReply(ctx, text, {
                reply_markup: getMailMenuKeyboard(false, config.developerContact)
            });
        }
    });

    // View Message
    bot.action(/^view_msg_(.+)$/, async (ctx) => {
        await ctx.answerCbQuery().catch(() => { });
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
                    // Improved regex to handle single quotes, extra spaces, and variations
                    const linkRegex = /<a\s+(?:[^>]*?\s+)?href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi;
                    let match;

                    rawBody = ""
                    const seenUrls = new Set();

                    while ((match = linkRegex.exec(htmlContent)) !== null) {
                        let url = match[1];
                        let text = match[2].replace(/<[^>]*>?/gm, '').trim();
                        
                        // Basic URL validation
                        if (!url.startsWith('http')) continue;
                        if (text.length < 2) text = "Link"; // Fallback text

                        if (seenUrls.has(url)) continue;
                        seenUrls.add(url);
                        const safeText = escapeHTML(text.substring(0, 30));
                        const safeUrl = escapeHTML(url);

                        actionButtons.push({
                            text: safeText,
                            url: url
                        });

                        rawBody += `\n<b>${safeText} 👇</b>\n<code>${safeUrl}</code>\n`;
                    }
                    rawBody = rawBody.trim();
                }

                let displayMsg = `📬 <b>Message Details:</b>\n\n`;
                displayMsg += `<b>From:</b> ${escapeHTML(m.from.address)}\n`;
                displayMsg += `<b>Subject:</b> ${escapeHTML(m.subject || '(No Subject)')}\n`;
                displayMsg += `<b>Date:</b> ${new Date(m.createdAt).toLocaleString()}\n\n`;
                displayMsg += `<b>Content:</b>\n\n${rawBody || "No content available."}`;

                await editOrReply(ctx, displayMsg, {
                    parse_mode: 'HTML',
                    disable_web_page_preview: true,
                    reply_markup: getMessageViewKeyboard(actionButtons)
                });
            } else {
                ctx.answerCbQuery("❌ Could not fetch message content.").catch(() => { });
            }
        } catch (error) {
            console.error("View Message Error:", error);
            ctx.answerCbQuery("❌ Error fetching message.").catch(() => { });
        }
    });

    // Mail Menu (Back Button)
    bot.action("mail_menu", async (ctx) => {
        await ctx.answerCbQuery().catch(() => { });
        const userId = ctx.from.id;
        const config = ctx.state.config

        if (!(await mailManager.hasActiveMail(userId))) {
            const text = "❌ No active mail found. Generate New From Below : ";
            return await editOrReply(ctx, text, {
                reply_markup: getMailMenuKeyboard(false, config.developerContact)
            });

        }

        const currentMail = await mailManager.getUserMail(userId);
        const text = `📧 <b>Your Active Mail:</b>\n\n<code>${escapeHTML(currentMail.username)}</code>\n\nClick refresh to check for incoming messages.`;
        await editOrReply(ctx, text, {
            parse_mode: 'HTML',
            reply_markup: getMailMenuKeyboard(true, config.developerContact)
        });
    });

    // Delete Mail
    bot.action("delete_mail", async (ctx) => {
        await ctx.answerCbQuery().catch(() => { });
        const userId = ctx.from.id;
        const config = ctx.state.config
        await mailManager.deleteMail(userId);

        const text = "🗑️ Email deleted successfully. Need a new one?";
        await editOrReply(ctx, text, {
            reply_markup: getMailMenuKeyboard(false, config.developerContact)
        });
    });

    // Change Mail
    bot.action("change_mail", async (ctx) => {
        await ctx.answerCbQuery().catch(() => { });
        const userId = ctx.from.id;
        const config = ctx.state.config
        await mailManager.deleteMail(userId);

        const newMail = await mailManager.generateMail(userId);
        if (newMail) {
            const text = `🔄 Mail Changed!\n\n📧 <code>${escapeHTML(newMail.username)}</code>\n\nCopy mail by clicking on the mail.`;
            await editOrReply(ctx, text, {
                parse_mode: 'HTML',
                reply_markup: getMailMenuKeyboard(true, config.developerContact)
            });
        } else {
            ctx.answerCbQuery("❌ Failed to generate new mail.", { show_alert: true }).catch(() => { });
        }
    });
}