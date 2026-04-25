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
    // Step 0: Welcome
    async (ctx) => {
        await ctx.reply(`Привет 🤍\nТы попала в мини-игру от Инги Беляковой.\n\nЗа несколько минут ты увидишь:\n— что сейчас происходит в твоём запросе\n— где тебя реально тормозит\n— какой шаг поможет сдвинуться с места\n\nЗадай внутри один вопрос, который сейчас важен.`);
        return ctx.wizard.next();
    },
    // Step 1: Direction
    async (ctx) => {
        if (!ctx.message || !ctx.message.text) {
            await ctx.reply('Жду твой вопрос в виде текста.');
            return;
        }
        ctx.scene.session.userData = {
            name: ctx.from.first_name,
            username: ctx.from.username,
            question: ctx.message.text,
            cards: [],
            clickedBooking: false
        };

        await ctx.reply(`Хорошо.\n\nСейчас будет не про «угадайку», а про тебя.\n\nНа секунду остановись.\n\nПодумай о своём запросе.\nНе размыто. Конкретно.\n\nЧто тебя сейчас больше всего цепляет?\n\nВыбери направление:`, 
            Markup.inlineKeyboard([
                [Markup.button.callback('💰 Деньги / доход', 'dir_money')],
                [Markup.button.callback('💭 Состояние / энергия', 'dir_energy')],
                [Markup.button.callback('🔥 Самореализация', 'dir_self')],
                [Markup.button.callback('❤️ Отношения', 'dir_love')],
                [Markup.button.callback('🚀 Движение / следующий шаг', 'dir_next')]
            ])
        );
        return ctx.wizard.next();
    },
    // Step 2: Confirmation
    async (ctx) => {
        if (ctx.callbackQuery) {
            ctx.scene.session.direction = ctx.callbackQuery.data;
            await ctx.answerCbQuery();
            await ctx.editMessageText(`Отлично.\n\nДержи в голове свой запрос именно в этом направлении.\n\nСейчас ты вытянешь 3 карты:\n\n1 карта — что происходит на самом деле\n2 карта — где ты себя тормозишь\n3 карта — какой шаг поможет сдвинуться\n\nНе пытайся «угадать правильно».\nПросто смотри, что откликается.\n\nГотова?`,
                Markup.inlineKeyboard([[Markup.button.callback('ВЫТЯНУТЬ 1 КАРТУ', 'pull_1')]])
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
            
            await ctx.reply(`Стоп.\n\nНе пролистывай.\n\nСейчас будет неприятно, но честно.\n\nОтветь себе:\n\n— Где ты уже видишь это, но продолжаешь делать вид, что «всё нормально»?\n— В чём ты себя оправдываешь вместо того, чтобы признать?\n— Что ты уже давно понимаешь… но не меняешь?\n\nНе нужно писать.\n\nПросто не убегай от ответа.\n\nОтветь честно самому себе\n\nЭто сейчас про тебя?`,
                Markup.inlineKeyboard([
                    [Markup.button.callback('🎯 да, в точку', 'fb1_yes')],
                    [Markup.button.callback('🤔 частично', 'fb1_part')],
                    [Markup.button.callback('❌ не откликается', 'fb1_no')]
                ])
            );
            return ctx.wizard.next();
        }
    },
    // Step 4: After Card 1
    async (ctx) => {
        if (ctx.callbackQuery) {
            const fb = ctx.callbackQuery.data;
            await ctx.answerCbQuery();
            if (fb === 'fb1_no') {
                await ctx.reply(`Тогда просто зафиксируй это как вариант.\n\nИногда не откликается сразу —\nно догоняет чуть позже.`, Markup.inlineKeyboard([[Markup.button.callback('ДАЛЬШЕ', 'pull_2')]]));
            } else {
                await ctx.reply(`Окей.\n\nТогда ты это уже видишь.\n\nВопрос — что ты с этим делаешь?`, Markup.inlineKeyboard([[Markup.button.callback('ДАЛЬШЕ', 'pull_2')]]));
            }
            return ctx.wizard.next();
        }
    },
    // Step 5: Pre Card 2
    async (ctx) => {
        if (ctx.callbackQuery) {
            await ctx.answerCbQuery();
            await ctx.reply(`Сейчас будет глубже.\n\nНе про ситуацию —\nа про то, где ты сама себя тормозишь.`,
                Markup.inlineKeyboard([[Markup.button.callback('ВЫТЯНУТЬ 2 КАРТУ', 'pull_2_real')]])
            );
            return ctx.wizard.next();
        }
    },
    // Step 6: Card 2
    async (ctx) => {
        if (ctx.callbackQuery && ctx.callbackQuery.data === 'pull_2_real') {
            const cards = getCards().obstacle;
            const card = cards[Math.floor(Math.random() * cards.length)];
            ctx.scene.session.userData.cards.push(card.image);
            
            await ctx.answerCbQuery();
            await ctx.replyWithPhoto({ source: path.join(__dirname, card.image) }, { caption: card.text });
            
            await ctx.reply(`Посмотри на эту карту\n\nЭто то, что сейчас тебя тормозит.\n\nУзнаёшь себя?`,
                Markup.inlineKeyboard([
                    [Markup.button.callback('😬 да, есть такое', 'fb2_yes')],
                    [Markup.button.callback('🤏 частично', 'fb2_part')],
                    [Markup.button.callback('❌ не про меня', 'fb2_no')]
                ])
            );
            return ctx.wizard.next();
        }
    },
    // Step 7: After Card 2
    async (ctx) => {
        if (ctx.callbackQuery) {
            const fb = ctx.callbackQuery.data;
            await ctx.answerCbQuery();
            if (fb === 'fb2_no') {
                await ctx.reply(`Окей.\n\nТогда просто держи это как вариант.\n\nИногда это проявляется не так очевидно.`, Markup.inlineKeyboard([[Markup.button.callback('ДАЛЬШЕ', 'trans_3')]]));
            } else {
                await ctx.reply(`Окей.\n\nЗначит ты это уже видишь.\n\nСкажи честно:\nты продолжаешь делать так же?`, Markup.inlineKeyboard([
                    [Markup.button.callback('да', 'trans_3')],
                    [Markup.button.callback('иногда', 'trans_3')],
                    [Markup.button.callback('нет', 'trans_3')]
                ]));
            }
            return ctx.wizard.next();
        }
    },
    // Step 8: Pre Card 3
    async (ctx) => {
        if (ctx.callbackQuery) {
            await ctx.answerCbQuery();
            await ctx.reply(`Вот поэтому и нет сдвига.\n\nНе из-за ситуации.\nА из-за того, как ты действуешь внутри неё.\n\nДавай покажу, что с этим делать.`,
                Markup.inlineKeyboard([[Markup.button.callback('ВЫТЯНУТЬ 3 КАРТУ', 'pull_3_real')]])
            );
            return ctx.wizard.next();
        }
    },
    // Step 9: Card 3 Display
    async (ctx) => {
        if (ctx.callbackQuery && ctx.callbackQuery.data === 'pull_3_real') {
            const cards = getCards().step;
            const card = cards[Math.floor(Math.random() * cards.length)];
            ctx.scene.session.userData.cards.push(card.image);
            
            await ctx.answerCbQuery();
            await ctx.replyWithPhoto({ source: path.join(__dirname, card.image) }, { caption: card.text });
            
            await ctx.reply(`Смотри.\n\nВот твой шаг.\n\nНе идеальный.\nНе когда-нибудь потом.\n\nА тот, который реально можно сделать.\n\nГотова попробовать?`,
                Markup.inlineKeyboard([
                    [Markup.button.callback('да', 'fb3_yes')],
                    [Markup.button.callback('пока нет', 'fb3_no')]
                ])
            );
            return ctx.wizard.next();
        }
    },
    // Step 10: After Card 3
    async (ctx) => {
        if (ctx.callbackQuery) {
            const fb = ctx.callbackQuery.data;
            await ctx.answerCbQuery();
            if (fb === 'fb3_yes') {
                await ctx.reply(`Тогда зафиксируй:\n\nЧто именно ты сделаешь в ближайшие 24 часа?`, Markup.inlineKeyboard([
                    [Markup.button.callback('сделаю это', 'fin_do')],
                    [Markup.button.callback('подумаю как', 'fin_do')],
                    [Markup.button.callback('позже', 'fin_do')]
                ]));
            } else {
                await ctx.reply(`Это нормально.\n\nНо давай честно:\n\nничего не изменится, если ничего не сделать.\n\nТы это уже видишь.\n\nВопрос только — когда ты решишь начать.`, Markup.inlineKeyboard([
                    [Markup.button.callback('хочу разобраться глубже', 'fin_do')],
                    [Markup.button.callback('пока не готова', 'fin_wait')]
                ]));
            }
            return ctx.wizard.next();
        }
    },
    // Step 11: Final
    async (ctx) => {
        if (ctx.callbackQuery) {
            const fb = ctx.callbackQuery.data;
            await ctx.answerCbQuery();
            
            if (fb === 'fin_do') {
                 ctx.scene.session.userData.clickedBooking = true;
            }
            saveLead(ctx.scene.session.userData);

            if (fb === 'fin_wait') {
                await ctx.reply(`Если чувствуешь, что хочешь не просто «подумать», а реально сдвинуться — напиши мне.\n\nЯ подберу формат под твой запрос:\n— индивидуально\n— или в группе`,
                    Markup.inlineKeyboard([[Markup.button.url('НАПИСАТЬ ИНГЕ', 'https://t.me/inga_belyakova')]])
                );
            } else {
                await ctx.reply(`Вот здесь начинается разница.\n\nМожно понять — и оставить как есть.\nА можно сделать — и получить другой результат.\n\nЕсли хочешь пройти глубже и разобрать свой запрос не в 3 шагах, а до реального изменения — приходи на игру.\n\nТам мы не просто смотрим.\nТам мы докручиваем до действия и результата.`,
                    Markup.inlineKeyboard([
                        [Markup.button.callback('ХОЧУ ИГРУ', 'go_game')],
                        [Markup.button.callback('ПОКА ДОСТАТОЧНО', 'stop_game')]
                    ])
                );
            }
            return ctx.scene.leave();
        }
    }
);

bot.action('go_game', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('Отлично! Напиши мне в личные сообщения для старта:', Markup.inlineKeyboard([[Markup.button.url('НАПИСАТЬ ИНГЕ', 'https://t.me/inga_belyakova')]]));
});
bot.action('stop_game', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('Поняла тебя! Возвращайся, когда почувствуешь готовность.');
});

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
        `Привет 🤍\n\nТы попала в мини-игру от Инги Беляковой.\nВыбери, как тебе удобнее пройти игру:`,
        Markup.inlineKeyboard([
            [Markup.button.webApp("🌟 ИГРАТЬ В WEB APP (Рекомендую)", WEBAPP_URL)],
            [Markup.button.callback("💬 ИГРАТЬ В ЧАТЕ (Текстовая версия)", "start_text_game")]
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
