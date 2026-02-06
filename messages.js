const messages = {
    start: {
        inline_keyboard: [
            [
                {
                    text: "📢 Join Channel",
                    url: "https://t.me/" + (process.env.CHANNEL_ID?.slice(1) || "")
                }
            ],
            [
                {
                    text: "✅ I Joined",
                    callback_data: "check_join"
                }
            ]
        ]
    },

    mailGenerated: {
        inline_keyboard: [
            
            [
                { text: "Refresh", callback_data: "refresh" },
                { text: "Delete Mail", callback_data: "delete_mail" }
            ],
            [
                { text: "Change Mail", callback_data: "change_mail" },
                { text: "Meet Developer", url: "https://t.me/DevilX01" }
            ]
        ]
    },
    mailNotGenerated: {
        inline_keyboard: [
            [
                { text: "Generate Mail", callback_data: "gen" },
                { text: "Meet Developer", url: "https://t.me/DevilX01" }
            ],
        ]
    }

};

export default messages;