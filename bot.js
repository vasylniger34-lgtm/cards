const { Telegraf, Scenes, session, Markup } = require('telegraf');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const WEBAPP_URL = process.env.WEBAPP_URL || `http://127.0.0.1:${PORT}`;

// --- Express Setup ---
const app = express();
app.use(cors());
app.use(express.json());

const webappPath = path.join(__dirname, 'webapp', 'dist');
app.use(express.static(webappPath));

const CARDS_PATH = path.join(__dirname, 'data', 'cards.json');
const LEADS_PATH = path.join(__dirname, 'leads.json');

const getCards = () => JSON.parse(fs.readFileSync(CARDS_PATH, 'utf-8'));
const saveLead = (lead) => {
    let leads = [];
    if (fs.existsSync(LEADS_PATH)) {
        leads = JSON.parse(fs.readFileSync(LEADS_PATH, 'utf-8'));
    }
    leads.push({ ...lead, timestamp: new Date().toISOString() });
    fs.writeFileSync(LEADS_PATH, JSON.stringify(leads, null, 2));
};

app.get('/api/cards', (req, res) => {
    try { res.json(getCards()); } 
    catch (e) { res.status(500).json({ error: 'Could not load cards' }); }
});

app.post('/api/save', (req, res) => {
    try {
        saveLead(req.body);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Could not save lead' }); }
});

// --- Telegraf Bot Setup ---
const bot = new Telegraf(process.env.BOT_TOKEN);

// Text Game Scene
const gameWizard = new Scenes.WizardScene(
    'GAME_SCENE',
    // Step 0: Welcome & Ask for question
    async (ctx) => {
        await ctx.reply(`Привіт 🤍\nЦе текстова версія міні-гри від Інги Бєлякової.\n\nЗадай одне питання, яке зараз важливе для тебе.`);
        return ctx.wizard.next();
    },
    // Step 1: Save question & Show Direction
    async (ctx) => {
        if (!ctx.message || !ctx.message.text) {
            await ctx.reply('Будь ласка, введи своє питання текстом.');
            return;
        }
        ctx.scene.session.question = ctx.message.text;
        ctx.scene.session.userData = {
            name: ctx.from.first_name,
            username: ctx.from.username,
            question: ctx.message.text,
            cards: [],
            clickedBooking: false
        };

        await ctx.reply(`Що тебе зараз найбільше чіпляє?\n\nВибери напрямок:`, 
            Markup.inlineKeyboard([
                [Markup.button.callback('💰 Гроші / дохід', 'dir_money')],
                [Markup.button.callback('💭 Стан / енергія', 'dir_energy')],
                [Markup.button.callback('🔥 Самореалізація', 'dir_self')],
                [Markup.button.callback('❤️ Стосунки', 'dir_love')],
                [Markup.button.callback('🚀 Наступний крок', 'dir_next')]
            ])
        );
        return ctx.wizard.next();
    },
    // Step 2: Confirm direction
    async (ctx) => {
        if (ctx.callbackQuery) {
            ctx.scene.session.direction = ctx.callbackQuery.data;
            await ctx.answerCbQuery();
            await ctx.editMessageText(`Зараз ти витягнеш 3 карти...\n\nГотова?`,
                Markup.inlineKeyboard([[Markup.button.callback('ВИТЯГНУТИ 1 КАРТУ', 'pull_1')]])
            );
            return ctx.wizard.next();
        }
    },
    // Step 3: Card 1 Display
    async (ctx) => {
        if (ctx.callbackQuery && ctx.callbackQuery.data === 'pull_1') {
            const cards = getCards().status;
            const card = cards[Math.floor(Math.random() * cards.length)];
            ctx.scene.session.userData.cards.push(card.image);
            
            await ctx.answerCbQuery();
            await ctx.replyWithPhoto({ source: path.join(__dirname, card.image) }, { caption: card.text });
            
            await ctx.reply(`Не побіжно, зупинись.\n\nВідповідай чесно самому собі: Це зараз про тебе?`,
                Markup.inlineKeyboard([
                    [Markup.button.callback('🎯 Так, в точку', 'fb1_yes')],
                    [Markup.button.callback('🤔 Частково', 'fb1_part')],
                    [Markup.button.callback('❌ Не відгукується', 'fb1_no')]
                ])
            );
            return ctx.wizard.next();
        }
    },
    // Step 4: After Card 1
    async (ctx) => {
        if (ctx.callbackQuery) {
            await ctx.answerCbQuery();
            await ctx.reply(`Йдемо далі. Що в тебе гальмує?`,
                Markup.inlineKeyboard([[Markup.button.callback('ВИТЯГНУТИ 2 КАРТУ', 'pull_2')]])
            );
            return ctx.wizard.next();
        }
    },
    // Step 5: Display Card 2
    async (ctx) => {
        if (ctx.callbackQuery && ctx.callbackQuery.data === 'pull_2') {
            const cards = getCards().obstacle;
            const card = cards[Math.floor(Math.random() * cards.length)];
            ctx.scene.session.userData.cards.push(card.image);
            
            await ctx.answerCbQuery();
            await ctx.replyWithPhoto({ source: path.join(__dirname, card.image) }, { caption: card.text });
            
            await ctx.reply(`Впізнаєш себе?`,
                Markup.inlineKeyboard([
                    [Markup.button.callback('😬 Так, є таке', 'fb2_yes')],
                    [Markup.button.callback('🤏 Частково діє', 'fb2_part')],
                    [Markup.button.callback('❌ Не про мене', 'fb2_no')]
                ])
            );
            return ctx.wizard.next();
        }
    },
    // Step 6: Transition to 3
    async (ctx) => {
        if (ctx.callbackQuery) {
            await ctx.answerCbQuery();
            await ctx.reply(`Ось чому немає зрушення. Не через ситуацію, а через те, як ти дієш всередині неї.\n\nДавай покажу, що з цим робити.`,
                Markup.inlineKeyboard([[Markup.button.callback('ВИТЯГНУТИ 3 КАРТУ', 'pull_3')]])
            );
            return ctx.wizard.next();
        }
    },
    // Step 7: Display Card 3
    async (ctx) => {
        if (ctx.callbackQuery && ctx.callbackQuery.data === 'pull_3') {
            const cards = getCards().step;
            const card = cards[Math.floor(Math.random() * cards.length)];
            ctx.scene.session.userData.cards.push(card.image);
            
            await ctx.answerCbQuery();
            await ctx.replyWithPhoto({ source: path.join(__dirname, card.image) }, { caption: card.text });
            
            await ctx.reply(`Смотри. Вот твой шаг. Не ідеальний, але той, що реально зробити.\n\nГотова спробувати?`,
                Markup.inlineKeyboard([
                    [Markup.button.callback('Зроблю в найближчі 24г', 'fb3_yes')],
                    [Markup.button.callback('Подумаю', 'fb3_think')],
                    [Markup.button.callback('Можливо пізніше', 'fb3_no')]
                ])
            );
            return ctx.wizard.next();
        }
    },
    // Step 8: Final
    async (ctx) => {
        if (ctx.callbackQuery) {
            const feedback = ctx.callbackQuery.data;
            await ctx.answerCbQuery();
            
            if (feedback === 'fb3_yes') {
                 ctx.scene.session.userData.clickedBooking = true;
            }
            saveLead(ctx.scene.session.userData);

            await ctx.reply(`Можна все зрозуміти — і залишити як є. А можна зробити крок — і отримати інший результат.\n\nЯкщо хочеш пройти глибше і розібрати свій запит не в 3 кроках, а до реальних змін — приходь на повноцінну гру.\n\nТам ми докручуємо до дії та результату.`,
                Markup.inlineKeyboard([
                    [Markup.button.url('НАПИСАТИ ІНЗІ', 'https://t.me/inga_belyakova')]
                ])
            );
            return ctx.scene.leave();
        }
    }
);

const stage = new Scenes.Stage([gameWizard]);

bot.use(session());
bot.use(stage.middleware());

// Action when user selects text game
bot.action('start_text_game', (ctx) => {
    ctx.answerCbQuery();
    ctx.scene.enter('GAME_SCENE');
});

bot.start(async (ctx) => {
    await ctx.reply(
        `Привіт! 🤍\n\nТи потрапила в міні-гру від Інги Бєлякової.\nОбери, як тобі зручніше пройти гру — в занурюючому Web App, або прямо тут у текстовому чаті:`,
        Markup.inlineKeyboard([
            [Markup.button.webApp("🌟 ЗІГРАТИ У WEB APP (Рекомендую)", WEBAPP_URL)],
            [Markup.button.callback("💬 ЗІГРАТИ В ЧАТІ (Текстова)", "start_text_game")]
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
