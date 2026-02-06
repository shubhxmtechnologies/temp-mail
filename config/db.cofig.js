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

const mailSessionSchema = new mongoose.Schema({
    telegramId: { type: Number, unique: true, index: true },
    account: {
        username: String,
        password: { type: String, select: true } // Ensure password is included
    }
}, { timestamps: true });

export const MailSession = mongoose.model("MailSession", mailSessionSchema);

const adminStateSchema = new mongoose.Schema({
    telegramId: { type: Number, unique: true, index: true },
    state: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

export const AdminState = mongoose.model("AdminState", adminStateSchema);

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