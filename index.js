import "dotenv/config";
import { bot } from './config/telegram.config.js';
import { connectDB } from './config/db.cofig.js';
import { initBotConfig } from "./helpers/admin.helpers.js";

// Middlewares
import { accessMiddleware } from "./src/bot/middlewares/access.middleware.js";
import { throttleMiddleware } from "./src/bot/middlewares/throttle.middleware.js";

// Handlers
import { registerAdminHandlers } from "./src/bot/handlers/admin.handler.js";
import { registerMailHandlers } from "./src/bot/handlers/mail.handler.js";
import { registerUserHandlers } from "./src/bot/handlers/user.handler.js";

async function bootstrap() {
    try {
        await connectDB();

        // Seed admin if provided in ENV
        const SEED_ADMIN = process.env.ADMIN_ID ? parseInt(process.env.ADMIN_ID) : null;
        await initBotConfig(SEED_ADMIN);

        // Register Global Middlewares
        bot.use(throttleMiddleware);
        bot.use(accessMiddleware);

        // Register All Handlers
        registerAdminHandlers(bot);
        registerMailHandlers(bot);
        registerUserHandlers(bot);

        // Error Handling
        bot.catch((err, ctx) => {
            console.error(`Error for update ${ctx.updateType}:`, err.message);
        });

        // Launch Bot
        console.log("🚀 Bot is starting...");
        bot.launch()

    } catch (error) {
        console.error("💥 Bootstrap failed:", error);
        process.exit(1);
    }
}

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// Global Exception Handling
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception thrown:', err);
    // Give some time for logging before exiting
    setTimeout(() => process.exit(1), 1000);
});

bootstrap();
