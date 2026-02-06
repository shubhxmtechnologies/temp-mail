import "dotenv/config"
import { bot } from './config/telegram.config.js';
import messages from "./messages.js";
import { connectDB } from './config/db.cofig.js';
import { saveToDb } from "./helpers/db.helpers.js"
import { checkSubscription } from './helpers/subscription.helpers.js';
import mailManager from "./config/mail.config.js";
await connectDB()

// check env
const BOT_TOKEN = process.env.BOT_TOKEN
const CHANNEL_ID = process.env.CHANNEL_ID
if (!BOT_TOKEN) {
    throw new Error("Bot token required");
}
if (!CHANNEL_ID) {
    throw new Error("provide channel url");

}
// middleware
// Middleware to check subscription before any action/command
bot.use(async (ctx, next) => {
    // Skip subscription check for start command and the check_join button
    // so users aren't trapped in a loop.
    if (ctx.message?.text === '/start' || ctx.callbackQuery?.data === 'check_join') {
        return next();
    }

    const userId = ctx.from?.id;
    if (!userId) return;

    const subscribed = await checkSubscription(userId);

    if (!subscribed) {
        const message = "❌ You must join our channel to use this bot!";
        const keyboard = { reply_markup: messages.start };

        // Handle both button clicks (callback_query) and text messages
        if (ctx.callbackQuery) {
            await ctx.answerCbQuery("❌ Channel join required!", { show_alert: true });
            // Optionally edit the current message to show the join button
            try {
                return await ctx.editMessageText(message, keyboard);
            } catch (e) {
                return await ctx.reply(message, keyboard);
            }
        }

        return ctx.reply(message, keyboard);
    }

    // User is subscribed, proceed to the next handler (gen, refresh, etc.)
    return next();
});

// start the bot
bot.start(async (ctx) => {
    if (!ctx.from) return;
    const { id, username, first_name, last_name } = ctx.from;
    const fullName = `${first_name}${last_name ? " " + last_name : ""}`;

    const [, subscribed] = await Promise.all([
        saveToDb(id, username, fullName),
        checkSubscription(id),
    ]);

    if (!subscribed) {
        return ctx.reply(
            "❌ You must join our channel to use this bot",
            {
                reply_markup: messages.start
            }
        );
    }
    // If user IS subscribed
    ctx.reply(
        "✅ Welcome! Choose an option:",
        {
            reply_markup: messages.mailNotGenerated
        }
    );
})

// if user clicks "I Joined" button
bot.action("check_join", async (ctx) => {
    const subscribed = await checkSubscription(ctx.from.id);

    if (!subscribed) {
        return ctx.answerCbQuery(
            "❌ Still not joined!",
            { show_alert: true }
        );
    }

    await ctx.editMessageText(
        "✅ Thanks for joining! Choose an option:",
        {
            reply_markup: messages.mailNotGenerated
        }
    );
});

// if user clicks genrate button
bot.action("gen", async (ctx) => {
    const userId = ctx.from.id;

    if (mailManager.hasActiveMail(userId)) {
        const currentMail = mailManager.getUserMail(userId);
        const check = await mailManager.refresh(userId);

        if (check && check.status) {
            // Use reply instead of edit to avoid "not modified" error if they spam click
            return ctx.replyWithHTML(`⚠️ You already have an active mail:\n\n📧 <code>${currentMail.username}</code>\n\nPlease use it or delete it first.\n
                
                Copy mail by clicking on the mail.`, {
                reply_markup: messages.mailGenerated
            });
        } else {
            mailManager.userSessions.delete(userId);
        }
    }

    const newMail = await mailManager.generateMail(userId);
    if (newMail) {
        try {
            await ctx.editMessageText(`✅ New Email Generated:\n\n📧 <code>${newMail.username}</code>\n\nClick refresh to check for incoming messages.\n
                
                Copy mail by clicking on the mail.`, {
                parse_mode: 'HTML',
                reply_markup: messages.mailGenerated
            });
        } catch (error) {
            // Fallback if edit fails
            ctx.replyWithHTML(`✅ Email Generated:\n📧 <code>${newMail.username}</code>\n
                
                Copy mail by clicking on the mail.`, {
                reply_markup: messages.mailGenerated
            });
        }
    } else {
        ctx.reply("❌ Failed to generate mail. Please try again later.");
    }
});

// if suer clicks refresh button
bot.action("refresh", async (ctx) => {
    const userId = ctx.from.id;

    if (!mailManager.hasActiveMail(userId)) {
        try {
            return await ctx.editMessageText("❌ No active mail found. Please generate one.", {
                reply_markup: messages.mailNotGenerated
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

            let msgText = "📬 <b>Your Inbox:</b>\n\nSelect a message to read its content:";
            
            const keyboard = {
                inline_keyboard: [
                    ...inbox.map((m, i) => ([{
                        text: `${i + 1}. From: ${m.from.name} - ${m.subject || '(No Subject)'}`,
                        callback_data: `view_msg_${m.id}`
                    }])),
                    [{ text: "⬅️ Back to Mail Menu", callback_data: "mail_menu" }]
                ]
            };

            try {
                return await ctx.editMessageText(msgText, {
                    parse_mode: 'HTML',
                    reply_markup: keyboard
                });
            } catch (error) {
                return await ctx.replyWithHTML(msgText, {
                    reply_markup: keyboard
                });
            }

        } else {
            throw new Error("Session Lost");
        }
    } catch (error) {
        console.error(error);
        mailManager.userSessions.delete(userId);
        try {
            await ctx.editMessageText("⚠️ Session expired. Please generate a new one.", {
                reply_markup: messages.mailNotGenerated
            });
        } catch (e) {
            ctx.answerCbQuery("Session expired.");
        }
    }
});

// handle viewing a specific message
// bot.action(/^view_msg_(.+)$/, async (ctx) => {
//     const userId = ctx.from.id;
//     const msgId = ctx.match[1];

//     try {
//         const res = await mailManager.getMessage(userId, msgId);
        
//         if (res && res.status && res.data) {
//             const m = res.data;
            
//             let content = `📬 <b>Message Details:</b>\n\n`;
//             content += `<b>From:</b> ${m.from.address}\n`;
//             content += `<b>Subject:</b> ${m.subject || '(No Subject)'}\n`;
//             content += `<b>Date:</b> ${new Date(m.createdAt).toLocaleString()}\n\n`;
//             content += `<b>Content:</b>\n${m.text || m.intro || "No text content available."}`;

//             // Truncate if too long for Telegram
//             if (content.length > 4000) {
//                 content = content.substring(0, 3997) + "...";
//             }

//             const keyboard = {
//                 inline_keyboard: [
//                     [{ text: "⬅️ Back to Inbox", callback_data: "refresh" }]
//                 ]
//             };

//             await ctx.editMessageText(content, {
//                 parse_mode: 'HTML',
//                 reply_markup: keyboard
//             });
//         } else {
//             ctx.answerCbQuery("❌ Could not fetch message content.");
//         }
//     } catch (error) {
//         console.error(error);
//         ctx.answerCbQuery("❌ Error fetching message.");
//     }
// });

// handle viewing a specific message
bot.action(/^view_msg_(.+)$/, async (ctx) => {
    const userId = ctx.from.id;
    const msgId = ctx.match[1];

    try {
        const res = await mailManager.getMessage(userId, msgId);

        if (res && res.status && res.data) {
            const m = res.data;

            // 1. Determine the source (Text vs HTML)
            let htmlContent = Array.isArray(m.html) ? m.html.join('') : (m.html || "");
            let rawBody = m.text || m.intro || "";

            const actionButtons = [];

            // 2. If no text but HTML exists, extract links and clean the body
            if (!rawBody && htmlContent) {
                // Extract <a> tags to create Telegram buttons
                const linkRegex = /<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*>(.*?)<\/a>/gi;
                let match;
                while ((match = linkRegex.exec(htmlContent)) !== null) {
                    let url = match[1];
                    let text = match[2].replace(/<[^>]*>?/gm, '').trim(); // Strip tags inside link text

                    if (text.length > 2 && url.startsWith('http')) {
                        actionButtons.push({ text: text.substring(0, 30), url: url });
                    }
                }

                // Clean the HTML for the message body
                rawBody = htmlContent
                    .replace(/<style([\s\S]*?)<\/style>/gi, '') // Remove CSS
                    .replace(/<br\s*\/?>/gi, '\n')               // Breaks to newlines
                    .replace(/<p[^>]*>/gi, '\n')                // Paragraphs to newlines
                    .replace(/<[^>]*>?/gm, '')                  // Strip all other tags
                    .replace(/&nbsp;/g, ' ')                    // Fix spaces
                    .replace(/\n\s*\n+/g, '\n\n')               // Remove excessive newlines
                    .trim();
            }

            let displayMsg = `📬 <b>Message Details:</b>\n\n`;
            displayMsg += `<b>From:</b> ${m.from.address}\n`;
            displayMsg += `<b>Subject:</b> ${m.subject || '(No Subject)'}\n`;
            displayMsg += `<b>Date:</b> ${new Date(m.createdAt).toLocaleString()}\n\n`;
            displayMsg += `<b>Content:</b>\n${rawBody || "No content available."}`;

            // Truncate for Telegram limit (4096 chars)
            if (displayMsg.length > 4000) {
                displayMsg = displayMsg.substring(0, 3997) + "...";
            }

            // 3. Build the Dynamic Keyboard
            const keyboard = {
                inline_keyboard: []
            };

            // Add extracted links as URL buttons (Limit to top 5)
            actionButtons.slice(0, 5).forEach(btn => {
                keyboard.inline_keyboard.push([{ text: `🔗 ${btn.text}`, url: btn.url }]);
            });

            // Add the "Back" button
            keyboard.inline_keyboard.push([{ text: "⬅️ Back to Inbox", callback_data: "refresh" }]);

            await ctx.editMessageText(displayMsg, {
                parse_mode: 'HTML',
                disable_web_page_preview: true, // Keeps the UI clean
                reply_markup: keyboard
            });
        } else {
            ctx.answerCbQuery("❌ Could not fetch message content.");
        }
    } catch (error) {
        console.error("View Message Error:", error);
        ctx.answerCbQuery("❌ Error fetching message.");
    }
});

// handle back to mail menu
bot.action("mail_menu", async (ctx) => {
    const userId = ctx.from.id;
    if (!mailManager.hasActiveMail(userId)) {
        return ctx.editMessageText("❌ No active mail found.", {
            reply_markup: messages.mailNotGenerated
        });
    }

    const currentMail = mailManager.getUserMail(userId);
    await ctx.editMessageText(`📧 <b>Your Active Mail:</b>\n\n<code>${currentMail.username}</code>\n\nClick refresh to check for incoming messages.`, {
        parse_mode: 'HTML',
        reply_markup: messages.mailGenerated
    });
});

// if suer clicks delete_mail button
bot.action("delete_mail", async (ctx) => {
    const userId = ctx.from.id;
    const deleted = await mailManager.deleteMail(userId);

    try {
        await ctx.editMessageText("🗑️ Email deleted successfully. Need a new one?", {
            reply_markup: messages.mailNotGenerated
        });
    } catch (error) {
        // If message is already edited, just toast the user
        ctx.answerCbQuery("🗑️ Deleted!");
    }
});
// if suer clicks change_mail button
bot.action("change_mail", async (ctx) => {
    const userId = ctx.from.id;
    await mailManager.deleteMail(userId);

    const newMail = await mailManager.generateMail(userId);
    if (newMail) {
        try {
            await ctx.editMessageText(`🔄 Mail Changed!\n\n📧 <code>${newMail.username}</code>\n
                
                Copy mail by clicking on the mail.`, {
                parse_mode: 'HTML',
                reply_markup: messages.mailGenerated
            });
        } catch (error) {
            ctx.replyWithHTML(`🔄 Mail Changed: <code>${newMail.username}</code>`, {
                reply_markup: messages.mailGenerated
            });
        }
    }
});

bot.catch((err, ctx) => {
    console.error(`Error for update ${ctx.updateType}:`, err.message);
});

bot.launch();
