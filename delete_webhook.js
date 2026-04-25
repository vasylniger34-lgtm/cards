const { Telegraf } = require('telegraf');
require('dotenv').config();
const bot = new Telegraf(process.env.BOT_TOKEN);
console.log('Deleting webhook...');
bot.telegram.deleteWebhook({ drop_pending_updates: true })
    .then(() => {
        console.log('Webhook deleted.');
        process.exit(0);
    })
    .catch(err => {
        console.error('Delete failed:', err);
        process.exit(1);
    });
