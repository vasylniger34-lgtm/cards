const { Telegraf, Scenes, session, Markup } = require('telegraf');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { exec } = require('child_process');
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const WEBAPP_URL = process.env.WEBAPP_URL || `http://127.0.0.1:${PORT}`;

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'webapp', 'dist')));

const CARDS_PATH = path.join(__dirname, 'webapp', 'src', 'data', 'cards.json');
const CONFIG_PATH = path.join(__dirname, 'webapp', 'src', 'data', 'config.json');
const LEADS_PATH = path.join(__dirname, 'leads.json');

const getCards = () => JSON.parse(fs.readFileSync(CARDS_PATH, 'utf-8'));
const getConfig = () => JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
const saveCards = (data) => fs.writeFileSync(CARDS_PATH, JSON.stringify(data, null, 2));
const saveConfig = (data) => fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2));

const saveLead = (lead) => {
    let leads = [];
    if (fs.existsSync(LEADS_PATH)) leads = JSON.parse(fs.readFileSync(LEADS_PATH, 'utf-8'));
    leads.push({ ...lead, timestamp: new Date().toISOString() });
    fs.writeFileSync(LEADS_PATH, JSON.stringify(leads, null, 2));
};

const pushToGithub = () => {
    exec('git add . && git commit -m "Admin panel update" && git push', { cwd: __dirname }, (err, stdout, stderr) => {
        if (err) console.error("Git Push Failed:", err);
        else console.log("Git Push Success");
    });
};

const bot = new Telegraf(process.env.BOT_TOKEN);

// ------------- TEXT GAME SCENE -------------
const gameWizard = new Scenes.WizardScene('GAME_SCENE',
    async (ctx) => {
        await ctx.reply(`Привет 🤍\nТы попала в мини-игру от Инги Беляковой.\n\nЗа несколько минут ты увидишь:\n— что сейчас происходит в твоём запросе\n— где тебя реально тормозит\n— какой шаг поможет сдвинуться с места\n\nЗадай внутри один вопрос, который сейчас важен.`);
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (!ctx.message || !ctx.message.text) return ctx.reply('Жду твой вопрос в виде текста.');
        ctx.scene.session.userData = {
            name: ctx.from.first_name, username: ctx.from.username, question: ctx.message.text, cards: [], clickedBooking: false
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
    async (ctx) => {
        if (ctx.callbackQuery && ctx.callbackQuery.data === 'pull_1') {
            const cards = getCards().status;
            const card = cards[Math.floor(Math.random() * cards.length)];
            ctx.scene.session.userData.cards.push(card.image);
            await ctx.answerCbQuery();
            await ctx.replyWithPhoto({ source: path.join(__dirname, 'webapp', 'public', 'images', card.image) }, { caption: card.text });
            await ctx.reply(`Стоп.\n\nНе пролистывай.\n\nСейчас будет неприятно, но честно.\n\nОтветь себе:\n\n— Где ты уже видишь это, но продолжаешь делать вид, что «всё нормально»?\n— В чём ты себя оправдываешь вместо того, чтобы признать?\n— Что ты уже давно понимаешь… но не меняешь?\n\nНе нужно писать.\n\nПросто не убегай от ответа.\n\nОтветь честно самому себе\n\nЭто сейчас про тебя?`,
                Markup.inlineKeyboard([
                    [Markup.button.callback('🎯 да, в точку', 'fb1_yes'), Markup.button.callback('🤔 частично', 'fb1_part')],
                    [Markup.button.callback('❌ не откликается', 'fb1_no')]
                ])
            );
            return ctx.wizard.next();
        }
    },
    async (ctx) => {
        if (ctx.callbackQuery) {
            const fb = ctx.callbackQuery.data;
            await ctx.answerCbQuery();
            if (fb === 'fb1_no') await ctx.reply(`Тогда просто зафиксируй это как вариант.\n\nИногда не откликается сразу —\nно догоняет чуть позже.`, Markup.inlineKeyboard([[Markup.button.callback('ДАЛЬШЕ', 'pull_2')]]));
            else await ctx.reply(`Окей.\n\nТогда ты это уже видишь.\n\nВопрос — что ты с этим делаешь?`, Markup.inlineKeyboard([[Markup.button.callback('ДАЛЬШЕ', 'pull_2')]]));
            return ctx.wizard.next();
        }
    },
    async (ctx) => {
        if (ctx.callbackQuery) {
            await ctx.answerCbQuery();
            await ctx.reply(`Сейчас будет глубже.\n\nНе про ситуацию —\nа про то, где ты сама себя тормозишь.`, Markup.inlineKeyboard([[Markup.button.callback('ВЫТЯНУТЬ 2 КАРТУ', 'pull_2_real')]]));
            return ctx.wizard.next();
        }
    },
    async (ctx) => {
        if (ctx.callbackQuery && ctx.callbackQuery.data === 'pull_2_real') {
            const cards = getCards().obstacle;
            const card = cards[Math.floor(Math.random() * cards.length)];
            ctx.scene.session.userData.cards.push(card.image);
            await ctx.answerCbQuery();
            await ctx.replyWithPhoto({ source: path.join(__dirname, 'webapp', 'public', 'images', card.image) }, { caption: card.text });
            await ctx.reply(`Посмотри на эту карту\n\nЭто то, что сейчас тебя тормозит.\n\nУзнаёшь себя?`,
                Markup.inlineKeyboard([
                    [Markup.button.callback('😬 да, есть такое', 'fb2_yes'), Markup.button.callback('🤏 частично', 'fb2_part')],
                    [Markup.button.callback('❌ не про меня', 'fb2_no')]
                ])
            );
            return ctx.wizard.next();
        }
    },
    async (ctx) => {
        if (ctx.callbackQuery) {
            const fb = ctx.callbackQuery.data;
            await ctx.answerCbQuery();
            if (fb === 'fb2_no') await ctx.reply(`Окей.\n\nТогда просто держи это как вариант.\n\nИногда это проявляется не так очевидно.`, Markup.inlineKeyboard([[Markup.button.callback('ДАЛЬШЕ', 'trans_3')]]));
            else await ctx.reply(`Окей.\n\nЗначит ты это уже видишь.\n\nСкажи честно:\nты продолжаешь делать так же?`, Markup.inlineKeyboard([[Markup.button.callback('да', 'trans_3'), Markup.button.callback('иногда', 'trans_3'), Markup.button.callback('нет', 'trans_3')]]));
            return ctx.wizard.next();
        }
    },
    async (ctx) => {
        if (ctx.callbackQuery) {
            await ctx.answerCbQuery();
            await ctx.reply(`Вот поэтому и нет сдвига.\n\nНе из-за ситуации.\nА из-за того, как ты действуешь внутри неё.\n\nДавай покажу, что с этим делать.`, Markup.inlineKeyboard([[Markup.button.callback('ВЫТЯНУТЬ 3 КАРТУ', 'pull_3_real')]]));
            return ctx.wizard.next();
        }
    },
    async (ctx) => {
        if (ctx.callbackQuery && ctx.callbackQuery.data === 'pull_3_real') {
            const cards = getCards().step;
            const card = cards[Math.floor(Math.random() * cards.length)];
            ctx.scene.session.userData.cards.push(card.image);
            await ctx.answerCbQuery();
            await ctx.replyWithPhoto({ source: path.join(__dirname, 'webapp', 'public', 'images', card.image) }, { caption: card.text });
            await ctx.reply(`Смотри.\n\nВот твой шаг.\n\nНе идеальный.\nНе когда-нибудь потом.\n\nА тот, который реально можно сделать.\n\nГотова попробовать?`,
                Markup.inlineKeyboard([
                    [Markup.button.callback('да', 'fb3_yes'), Markup.button.callback('пока нет', 'fb3_no')]
                ])
            );
            return ctx.wizard.next();
        }
    },
    async (ctx) => {
        if (ctx.callbackQuery) {
            const fb = ctx.callbackQuery.data;
            await ctx.answerCbQuery();
            if (fb === 'fb3_yes') {
                await ctx.reply(`Тогда зафиксируй:\n\nЧто именно ты сделаешь в ближайшие 24 часа?`, Markup.inlineKeyboard([
                    [Markup.button.callback('сделаю это', 'fin_do'), Markup.button.callback('подумаю как', 'fin_do')],
                    [Markup.button.callback('позже', 'fin_do')]
                ]));
            } else {
                await ctx.reply(`Это нормально.\n\nНо давай честно:\n\nничего не изменится, если ничего не сделать.\n\nТы это уже видишь.\n\nВопрос только — когда ты решишь начать.`, Markup.inlineKeyboard([
                    [Markup.button.callback('хочу разобраться глубже', 'fin_do'), Markup.button.callback('пока не готова', 'fin_wait')]
                ]));
            }
            return ctx.wizard.next();
        }
    },
    async (ctx) => {
        if (ctx.callbackQuery) {
            const fb = ctx.callbackQuery.data;
            await ctx.answerCbQuery();
            if (fb === 'fin_do') ctx.scene.session.userData.clickedBooking = true;
            saveLead(ctx.scene.session.userData);
            
            const cfg = getConfig();
            if (fb === 'fin_wait') {
                await ctx.reply(`Если чувствуешь, что хочешь не просто «подумать», а реально сдвинуться — напиши мне.\n\nЯ подберу формат под твой запрос:\n— индивидуально\n— или в группе`, Markup.inlineKeyboard([[Markup.button.url('НАПИСАТЬ ИНГЕ', cfg.contactLink)]]));
            } else {
                await ctx.reply(`${cfg.finalMessageTitle}\n\n${cfg.finalMessageBody1}\n\n${cfg.finalMessageBody2}\n\n${cfg.finalMessageBody3}`,
                    Markup.inlineKeyboard([[Markup.button.callback(cfg.ctaButtonText, 'go_game')], [Markup.button.callback('ПОКА ДОСТАТОЧНО', 'stop_game')]])
                );
            }
            return ctx.scene.leave();
        }
    }
);

bot.action('go_game', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('Отлично! Напиши мне в личные сообщения для старта:', Markup.inlineKeyboard([[Markup.button.url('НАПИСАТЬ ИНГЕ', getConfig().contactLink)]]));
});
bot.action('stop_game', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('Поняла тебя! Возвращайся, когда почувствуешь готовность.');
});

// ------------- ADMIN SCENE -------------
const adminScene = new Scenes.WizardScene('ADMIN_SCENE',
    // Ask for category
    async (ctx) => {
        await ctx.reply("Панель Адміністратора\nОберіть що редагувати:", Markup.inlineKeyboard([
            [Markup.button.callback("💳 Картки Ситуацій (1 карта)", "admin_cat_status")],
            [Markup.button.callback("💳 Картки Тормозу (2 карта)", "admin_cat_obstacle")],
            [Markup.button.callback("💳 Картки Кроку (3 карта)", "admin_cat_step")],
            [Markup.button.callback("📝 Редагувати тексти WebApp", "admin_texts")],
            [Markup.button.callback("❌ Вийти", "admin_exit")]
        ]));
        return ctx.wizard.next();
    },
    // Handle category / texts
    async (ctx) => {
        if (!ctx.callbackQuery) return;
        const data = ctx.callbackQuery.data;
        await ctx.answerCbQuery();
        
        if (data === 'admin_exit') {
            await ctx.reply("Вийшли з панелі.");
            return ctx.scene.leave();
        }
        
        if (data === 'admin_texts') {
            const cfg = getConfig();
            ctx.scene.session.configTemp = { ...cfg };
            await ctx.reply(`Редагування текстів. Виберіть поле:`, Markup.inlineKeyboard([
                [Markup.button.callback("Заголовок фіналу", "edit_finalMessageTitle")],
                [Markup.button.callback("Текст фіналу 1", "edit_finalMessageBody1")],
                [Markup.button.callback("Текст фіналу 2", "edit_finalMessageBody2")],
                [Markup.button.callback("Текст фіналу 3", "edit_finalMessageBody3")],
                [Markup.button.callback("Текст Кнопки (CTA)", "edit_ctaButtonText")],
                [Markup.button.callback("Посилання Кнопки", "edit_contactLink")],
                [Markup.button.callback("💾 Зберегти", "save_texts")],
                [Markup.button.callback("❌ Назад", "admin_back")]
            ]));
            return ctx.wizard.selectStep(4);
        }
        
        if (data.startsWith('admin_cat_')) {
            const cat = data.split('_')[2];
            ctx.scene.session.cat = cat;
            const db = getCards();
            const cards = db[cat] || [];
            if(cards.length === 0) {
                 await ctx.reply(`В категорії ${cat} немає карток.`);
            } else {
                 await ctx.reply(`Картки ${cat} (${cards.length} шт):`);
                 for(let i=0; i<cards.length; i++) {
                     try {
                        await ctx.replyWithPhoto(
                            { source: path.join(__dirname, 'webapp', 'public', 'images', cards[i].image) }, 
                            { caption: `Індекс: ${i}\nТекст: ${cards[i].text}`, ...Markup.inlineKeyboard([[Markup.button.callback(`🗑 Видалити #${i}`, `del_card_${i}`)]]) }
                        );
                     } catch(err){}
                 }
            }
            await ctx.reply("Для додавання нової картки відправте сюди фото з підписом (текст картки).");
            return ctx.wizard.next();
        }
    },
    // Handle new card or delete
    async (ctx) => {
        if (ctx.callbackQuery) {
            const data = ctx.callbackQuery.data;
            await ctx.answerCbQuery();
            if (data.startsWith('del_card_')) {
                const idx = parseInt(data.replace('del_card_', ''));
                const cat = ctx.scene.session.cat;
                const db = getCards();
                if(db[cat]) db[cat].splice(idx, 1);
                saveCards(db);
                pushToGithub();
                await ctx.reply(`Картку ${idx} видалено. Github деплой запущено!`);
                return ctx.scene.leave();
            }
        }
        if (ctx.message && ctx.message.photo) {
            const cat = ctx.scene.session.cat;
            const photo = ctx.message.photo[ctx.message.photo.length - 1];
            const text = ctx.message.caption || "Нова карта";
            
            await ctx.reply("Завантажую...");
            const fileUrl = await ctx.telegram.getFileLink(photo.file_id);
            const ext = path.extname(fileUrl.href) || '.jpg';
            const filename = `photo_${Date.now()}${ext}`;
            const filepath = path.join(__dirname, 'webapp', 'public', 'images', filename);
            
            const writer = fs.createWriteStream(filepath);
            const response = await axios({ url: fileUrl.href, method: 'GET', responseType: 'stream' });
            response.data.pipe(writer);
            
            writer.on('finish', async () => {
                const db = getCards();
                if(!db[cat]) db[cat] = [];
                db[cat].push({ image: filename, text: text });
                saveCards(db);
                pushToGithub();
                await ctx.reply(`Картку додано до ${cat}! Github деплой запущено.`);
                ctx.scene.leave();
            });
            writer.on('error', () => { ctx.reply('Помилка завантаження'); ctx.scene.leave(); });
        }
    },
    // Handle text edit selection (dummy for alignment)
    async (ctx) => { return ctx.wizard.next() },
    // Step 4: text fields
    async (ctx) => {
        if (ctx.callbackQuery) {
            const data = ctx.callbackQuery.data;
            await ctx.answerCbQuery();
            if(data === 'admin_back') {
                ctx.scene.reenter();
                return;
            }
            if(data === 'save_texts') {
                saveConfig(ctx.scene.session.configTemp);
                pushToGithub();
                await ctx.reply("Налаштування збережено! Деплой на Vercel запущено.");
                return ctx.scene.leave();
            }
            if(data.startsWith('edit_')) {
                const field = data.replace('edit_', '');
                ctx.scene.session.editField = field;
                await ctx.reply(`Надішліть новий текст для поля ${field}\nПоточне: ${ctx.scene.session.configTemp[field]}`);
                return ctx.wizard.next();
            }
        }
    },
    // Step 5: process new text
    async (ctx) => {
        if(ctx.message && ctx.message.text) {
            const f = ctx.scene.session.editField;
            ctx.scene.session.configTemp[f] = ctx.message.text;
            await ctx.reply(`Поле оновлено! Оберіть далі або Збережіть:`, Markup.inlineKeyboard([
                [Markup.button.callback("Заголовок фіналу", "edit_finalMessageTitle")],
                [Markup.button.callback("Текст фіналу 1", "edit_finalMessageBody1")],
                [Markup.button.callback("Текст фіналу 2", "edit_finalMessageBody2")],
                [Markup.button.callback("Текст фіналу 3", "edit_finalMessageBody3")],
                [Markup.button.callback("Текст Кнопки (CTA)", "edit_ctaButtonText")],
                [Markup.button.callback("Посилання Кнопки", "edit_contactLink")],
                [Markup.button.callback("💾 Зберегти ВСЕ", "save_texts")]
            ]));
            return ctx.wizard.selectStep(4);
        }
    }
);

const stage = new Scenes.Stage([gameWizard, adminScene]);
bot.use(session());
bot.use(stage.middleware());

bot.command('admin', async (ctx) => {
    let adminId = process.env.ADMIN_ID;
    if (!adminId) {
        // Create ADMIN_ID if missing
        const envPath = path.join(__dirname, '.env');
        let envVal = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
        envVal += `\nADMIN_ID=${ctx.from.id}`;
        fs.writeFileSync(envPath, envVal);
        process.env.ADMIN_ID = ctx.from.id.toString();
        await ctx.reply("Ви успішно записані як Адміністратор.");
        return ctx.scene.enter('ADMIN_SCENE');
    }
    
    if (ctx.from.id.toString() !== process.env.ADMIN_ID.toString()) {
        return ctx.reply("У вас немає доступу.");
    }
    return ctx.scene.enter('ADMIN_SCENE');
});

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

bot.catch((err, ctx) => console.error(`Error`, err));

app.listen(PORT, () => {
    console.log(`Express is running on ${PORT}`);
    console.log(`Web App URL is: ${WEBAPP_URL}`);
    bot.launch().then(() => console.log('Telegram Bot running...'));
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
