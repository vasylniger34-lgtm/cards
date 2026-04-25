const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const PORT = process.env.PORT || 3000;
// We allow ngrok passing or just fallback to 127.0.0.1. Telegram requires HTTPS for real mini-apps.
const WEBAPP_URL = process.env.WEBAPP_URL || `http://127.0.0.1:${PORT}`;

// Express Setup
const app = express();
app.use(cors());
app.use(express.json());

// Serve the static Vite build
const webappPath = path.join(__dirname, 'webapp', 'dist');
app.use(express.static(webappPath));

// API Routes for WebApp
const CARDS_PATH = path.join(__dirname, 'data', 'cards.json');
const LEADS_PATH = path.join(__dirname, 'leads.json');

app.get('/api/cards', (req, res) => {
    try {
        const cards = JSON.parse(fs.readFileSync(CARDS_PATH, 'utf-8'));
        res.json(cards);
    } catch (e) {
        res.status(500).json({ error: 'Could not load cards' });
    }
});

app.post('/api/save', (req, res) => {
    try {
        let leads = [];
        if (fs.existsSync(LEADS_PATH)) {
            leads = JSON.parse(fs.readFileSync(LEADS_PATH, 'utf-8'));
        }
        leads.push({ ...req.body, timestamp: new Date().toISOString() });
        fs.writeFileSync(LEADS_PATH, JSON.stringify(leads, null, 2));
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Could not save lead' });
    }
});

// Telegraf Bot Setup
const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start(async (ctx) => {
    await ctx.reply(
        `Привіт! 🤍\n\nТи потрапила в міні-гру від Інги Бєлякової.\nНатисни кнопку нижче, щоб почати своє занурення.`,
        Markup.inlineKeyboard([
            [Markup.button.webApp("🌟 ПОЧАТИ ГРУ", WEBAPP_URL)]
        ])
    );
});

bot.catch((err, ctx) => {
    console.error(`Error for ${ctx.updateType}`, err);
});

// Start Express and Bot
app.listen(PORT, () => {
    console.log(`Express server is running on port ${PORT}`);
    console.log(`Web App URL is set to: ${WEBAPP_URL}`);
    bot.launch().then(() => {
        console.log('Telegram Bot is running...');
    });
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
