export const getStartKeyboard = (channelLink) => ({

    inline_keyboard: [
        [{ text: "📢 Join Channel", url: "https://t.me/" + channelLink.slice(1) }],
        [{ text: "✅ I Joined", callback_data: "check_join" }]
    ]
});

export const getMailMenuKeyboard = (hasMail, developerContact) => {
    if (!hasMail) {
        return {
            inline_keyboard: [
                [{ text: "Generate Mail", callback_data: "gen" }, { text: "Meet Developer", url: developerContact }]
            ]
        };
    }
    return {
        inline_keyboard: [
            [{ text: "Refresh", callback_data: "refresh" }, { text: "Delete Mail", callback_data: "delete_mail" }],
            [{ text: "Change Mail", callback_data: "change_mail" }, { text: "Meet Developer", url: developerContact }]
        ]
    };
};

export const getInboxKeyboard = (inbox) => {
    const keyboard = inbox.map((m, i) => ([{
        text: `${i + 1}. From: ${m.from.name || m.from.address.split('@')[0]} - ${m.subject || '(No Subject)'}`,
        callback_data: `view_msg_${m.id}`
    }]));
    keyboard.push([{ text: "⬅️ Back to Mail Menu", callback_data: "mail_menu" }]);
    return { inline_keyboard: keyboard };
};

export const getMessageViewKeyboard = (actionButtons) => {
    const keyboard = [];
    actionButtons.slice(0, 5).forEach(btn => {
        keyboard.push([{ text: `🔗 ${btn.text}`, url: btn.url }]);
    });
    keyboard.push([{ text: "⬅️ Back to Inbox", callback_data: "refresh" }]);
    return { inline_keyboard: keyboard };
};

export const getAdminDashboardKeyboard = () => ({
    inline_keyboard: [
        [{ text: "📊 Stats", callback_data: "admin_stats" }, { text: "📢 Broadcast", callback_data: "admin_broadcast" }],
        [{ text: "⏩ Forward Post", callback_data: "admin_forward" }],
        [{ text: "⚙️ Settings", callback_data: "admin_settings" }, { text: "👥 Admins", callback_data: "admin_admins" }],
        [{ text: "❌ Close", callback_data: "admin_close" }]
    ]
});

export const getAdminSettingsKeyboard = () => ({
    inline_keyboard: [
        [{ text: "📝 Change Channel ID", callback_data: "admin_set_channel_id" }],
        [{ text: "🔗 Change Join Link", callback_data: "admin_set_channel_link" }],
        [{ text: "👤 Change Dev Contact", callback_data: "admin_set_dev" }],
        [{ text: "🔙 Back", callback_data: "admin_menu" }]
    ]
});

export const getAdminManageKeyboard = () => ({
    inline_keyboard: [
        [{ text: "➕ Add Admin", callback_data: "admin_add_admin" }],
        [{ text: "➖ Remove Admin", callback_data: "admin_remove_admin" }],
        [{ text: "🔙 Back", callback_data: "admin_menu" }]
    ]
});

export const getCancelKeyboard = () => ({
    inline_keyboard: [[{ text: "❌ Cancel", callback_data: "admin_cancel_state" }]]
});
