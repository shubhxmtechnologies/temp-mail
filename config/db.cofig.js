import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        telegramId: { type: Number, unique: true, index: true },
        username: {
            type: String,
        },
        name: {
            type: String,
        },
    },
    { timestamps: true }
);

export const User = mongoose.model("User", userSchema)

const botConfigSchema = new mongoose.Schema({
    admins: [{ type: Number }], // Array of admin Telegram IDs
    channelId: { type: String, default: "" }, // Channel ID for subscription check
    channelLink: { type: String, default: "" }, // Join link
    developerContact: { type: String, default: "" } // Developer contact link
});

export const BotConfig = mongoose.model("BotConfig", botConfigSchema);

export const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI+"TG_BOT", {
            autoIndex: true,
        });

        console.log("✅ MongoDB connected");
    } catch (error) {
        console.error("❌ MongoDB connection failed:", error.message);
        process.exit(1);
    }
};