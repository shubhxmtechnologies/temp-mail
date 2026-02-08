const userLastAction = new Map();
const THROTTLE_MS = 1000; // 1 second between clicks

export async function throttleMiddleware(ctx, next) {
    if (ctx.callbackQuery) {
        const userId = ctx.from.id;
        const now = Date.now();
        const lastAction = userLastAction.get(userId);

        if (lastAction && now - lastAction < THROTTLE_MS) {
            return ctx.answerCbQuery("⚠️ Please slow down! Wait a moment.", { show_alert: false }).catch(() => { });
        }

        userLastAction.set(userId, now);
    }
    return next();
}
