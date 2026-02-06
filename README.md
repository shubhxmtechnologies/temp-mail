# Telegram Temp Mail Bot

A powerful Telegram bot that provides temporary email addresses using the `mailjs` library. Users can generate disposable emails, receive messages, and view content directly within Telegram.

## 🚀 Features

- **Instant Email Generation**: Create a temporary email address with one click.
- **Inbox Management**: Refresh your inbox to check for new messages.
- **Message Viewer**: Read HTML and text emails with automatic link extraction for easy access.
- **Mandatory Subscription**: Optional feature to require users to join a specific channel before using the bot.
- **Admin Dashboard**: Manage bot settings, broadcast messages to all users, and monitor user stats.
- **Multi-Admin Support**: Add or remove admins dynamically via the admin panel.
- **Persistent Sessions**: User email sessions and admin states are stored in MongoDB, so they persist even if the bot restarts.

## 🛠️ How It Works

1.  **Start**: Users start the bot and are greeted by a welcome message.
2.  **Access Control**: The `accessMiddleware` checks if the user is an admin or if they have joined the required Telegram channel.
3.  **Mail Generation**: When a user clicks "Generate Mail", the bot uses the `mailjs` API to create a new account.
4.  **Session Management**: Account details (username/password) are securely stored in MongoDB.
5.  **Inbox Refresh**: The bot fetches the latest messages from the `mailjs` service and displays them as inline buttons.
6.  **Viewing Content**: Clicking a message fetches the full content, cleans up HTML for Telegram display, and extracts important links (like verification buttons).

## 📋 Prerequisites

- **Node.js**: v18 or higher.
- **MongoDB**: A local instance or a MongoDB Atlas URI.
- **Telegram Bot Token**: Get one from [@BotFather](https://t.me/BotFather).

## ⚙️ Configuration

Create a `.env` file in the root directory and fill in your details:

```env
BOT_TOKEN=your_bot_token
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/
CHANNEL_ID=-100xxxxxxxxxx
CHANNEL_LINK=https://t.me/your_channel
ADMIN_ID=your_telegram_id
```

> **Note:** Ensure your `MONGO_URI` includes a trailing `/` if you are using the default connection logic.

## 📦 Installation

1.  Clone the repository:
    ```bash
    git clone <repository_url>
    cd temp-mail
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the bot:
    ```bash
    node index.js
    ```

## 🌐 Deployment on VPS

To keep your bot running 24/7 on a VPS (like Ubuntu), follow these steps:

### 1. Install Node.js and PM2
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 (Process Manager)
sudo npm install -g pm2
```

### 2. Setup the Project
```bash
git clone <repository_url>
cd temp-mail
npm install
nano .env # Paste your environment variables here
```

### 3. Start the Bot with PM2
```bash
pm2 start index.js --name "temp-mail-bot"
```

### 4. Manage the Bot
- **Check Status**: `pm2 status`
- **Check Logs**: `pm2 logs temp-mail-bot`
- **Restart**: `pm2 restart temp-mail-bot`
- **Stop**: `pm2 stop temp-mail-bot`

### 5. Enable Auto-Restart on Boot
```bash
pm2 startup
pm2 save
```

## 🤝 Support
For any issues, contact the developer via the bot.

