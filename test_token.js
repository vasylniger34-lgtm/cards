const { Telegraf } = require('telegraf');
require('dotenv').config();
const bot = new Telegraf(process.env.BOT_TOKEN);
console.log('Testing token...');
bot.telegram.getMe().then(me => {
    console.log('Token is valid for bot:', me.username);
    process.exit(0);
}).catch(err => {
    console.error('Token test failed:', err);
    process.exit(1);
});
