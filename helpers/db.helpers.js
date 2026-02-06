import { User } from "../config/db.cofig.js";

async function saveToDb(userId, user_Name, fullName) {
    try {
        if (!userId) {
            return;
        }

        const user = await User.findOneAndUpdate(
            { telegramId: userId },
            {
                telegramId: userId,
                username: user_Name || null,
                name: fullName
            },
            {
                upsert: true,     // Create if doesn't exist
                new: true,        // Return the modified document
                setDefaultsOnInsert: true
            }
        );
        return user
    } catch (error) {
        console.error("Error saving user to DB:", error);
        return null;
    }
}

export { saveToDb }