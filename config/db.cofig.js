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

export const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            autoIndex: true,
        });

        console.log("✅ MongoDB connected");
    } catch (error) {
        console.error("❌ MongoDB connection failed:", error.message);
        process.exit(1);
    }
};