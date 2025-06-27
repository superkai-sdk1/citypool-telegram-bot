"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const telegraf_1 = require("telegraf");
const cron = __importStar(require("node-cron"));
const http = __importStar(require("http"));
const database_1 = require("./database");
const pollScheduler_1 = require("./pollScheduler");
const messageCleaner_1 = require("./messageCleaner");
const reminderService_1 = require("./reminderService");
const keepAliveService_1 = require("./keepAliveService");
// Загружаем переменные окружения
dotenv_1.default.config();
class CityPoolBot {
    constructor() {
        const botToken = process.env.BOT_TOKEN;
        if (!botToken) {
            throw new Error('BOT_TOKEN не найден в переменных окружения');
        }
        this.bot = new telegraf_1.Telegraf(botToken);
        this.database = new database_1.Database();
        this.pollScheduler = new pollScheduler_1.PollScheduler(this.bot, this.database);
        this.messageCleaner = new messageCleaner_1.MessageCleaner(this.bot);
        this.reminderService = new reminderService_1.ReminderService(this.bot, this.database);
        this.keepAliveService = new keepAliveService_1.KeepAliveService();
        this.setupMiddleware();
        this.setupCommands();
        this.setupMessageHandlers();
        this.setupScheduler();
        this.setupHealthCheck();
    }
    setupMiddleware() {
        // Добавляем базу данных в контекст
        this.bot.use((ctx, next) => {
            ctx.database = this.database;
            return next();
        });
    }
    setupCommands() {
        // Команда для инициализации групп (только для разработчика)
        this.bot.command('init', async (ctx) => {
            try {
                // Инициализируем фиксированные группы
                const cityGroupId = parseInt(process.env.CITY_GROUP_ID || '0');
                const classicGroupId = parseInt(process.env.CLASSIC_GROUP_ID || '0');
                const cityTopicId = process.env.CITY_TOPIC_ID ? parseInt(process.env.CITY_TOPIC_ID) : undefined;
                if (cityGroupId) {
                    await this.database.saveGroupConfig(cityGroupId, 'city', cityTopicId);
                    console.log(`✅ Инициализирована City группа: ${cityGroupId}`);
                }
                if (classicGroupId) {
                    await this.database.saveGroupConfig(classicGroupId, 'classic');
                    console.log(`✅ Инициализирована Classic группа: ${classicGroupId}`);
                }
                await ctx.reply('✅ Группы инициализированы в базе данных');
            }
            catch (error) {
                console.error('Ошибка при инициализации групп:', error);
                await ctx.reply('❌ Произошла ошибка при инициализации');
            }
        });
        // Команда для получения информации о настройках
        this.bot.command('info', async (ctx) => {
            try {
                const cityGroupId = parseInt(process.env.CITY_GROUP_ID || '0');
                const classicGroupId = parseInt(process.env.CLASSIC_GROUP_ID || '0');
                const cityTopicId = process.env.CITY_TOPIC_ID;
                let infoText = `ℹ️ Настройки бота:\n\n`;
                infoText += `🏙️ TITAN | City: ${cityGroupId}${cityTopicId ? ` (топик: ${cityTopicId})` : ''}\n`;
                infoText += `⚽ TITAN | Classic: ${classicGroupId}\n\n`;
                infoText += `⏰ Время опросов: ${process.env.POLL_TIME || '01:00'}\n`;
                infoText += `🌍 Часовой пояс: ${process.env.TIMEZONE || 'Europe/Moscow'}\n\n`;
                infoText += `📅 Расписание:\n`;
                infoText += `• Городская мафия: ПН, СР, ПТ\n`;
                infoText += `• Спортивная мафия: ВТ, ЧТ, СБ\n\n`;
                infoText += `🔔 Напоминания до: ${process.env.REMINDER_END_TIME || '19:00'}`;
                await ctx.reply(infoText);
            }
            catch (error) {
                console.error('Ошибка при получении информации:', error);
                await ctx.reply('❌ Произошла ошибка');
            }
        });
        // Команда для тестирования опросов
        this.bot.command('testcity', async (ctx) => {
            try {
                const userId = ctx.from?.id;
                if (!userId)
                    return;
                // Проверяем админа (можно добавить список админов в env)
                const cityGroupId = parseInt(process.env.CITY_GROUP_ID || '0');
                const cityTopicId = process.env.CITY_TOPIC_ID ? parseInt(process.env.CITY_TOPIC_ID) : undefined;
                if (cityGroupId) {
                    await this.pollScheduler.sendPoll(cityGroupId, 'city', 'Городская мафия (ТЕСТ)', cityTopicId);
                    await ctx.reply('✅ Тестовый опрос "Городская мафия" отправлен');
                }
                else {
                    await ctx.reply('❌ City группа не настроена');
                }
            }
            catch (error) {
                console.error('Ошибка при отправке тестового опроса:', error);
                await ctx.reply('❌ Ошибка при отправке тестового опроса');
            }
        });
        this.bot.command('testclassic', async (ctx) => {
            try {
                const userId = ctx.from?.id;
                if (!userId)
                    return;
                const classicGroupId = parseInt(process.env.CLASSIC_GROUP_ID || '0');
                if (classicGroupId) {
                    await this.pollScheduler.sendPoll(classicGroupId, 'classic', 'Спортивная мафия (ТЕСТ)');
                    await ctx.reply('✅ Тестовый опрос "Спортивная мафия" отправлен');
                }
                else {
                    await ctx.reply('❌ Classic группа не настроена');
                }
            }
            catch (error) {
                console.error('Ошибка при отправке тестового опроса:', error);
                await ctx.reply('❌ Ошибка при отправке тестового опроса');
            }
        });
        // Команда для переотправки опроса
        this.bot.command('renewpoll', async (ctx) => {
            try {
                const chatId = ctx.chat?.id;
                if (!chatId)
                    return;
                const today = new Date();
                const dayOfWeek = today.getDay(); // 0 = воскресенье, 1 = понедельник...
                // Определяем тип группы и какой опрос должен быть сегодня
                const cityGroupId = parseInt(process.env.CITY_GROUP_ID || '0');
                const classicGroupId = parseInt(process.env.CLASSIC_GROUP_ID || '0');
                let pollType = null;
                let pollTitle = '';
                let targetChatId = chatId;
                let threadId;
                // Проверяем откуда пришла команда и что должно быть сегодня
                if (chatId === cityGroupId) {
                    // Команда из City группы
                    if ([1, 3, 5].includes(dayOfWeek)) { // Понедельник, Среда, Пятница
                        pollType = 'city';
                        pollTitle = 'Городская мафия';
                        threadId = process.env.CITY_TOPIC_ID ? parseInt(process.env.CITY_TOPIC_ID) : undefined;
                    }
                }
                else if (chatId === classicGroupId) {
                    // Команда из Classic группы
                    if ([2, 4, 6].includes(dayOfWeek)) { // Вторник, Четверг, Суббота
                        pollType = 'classic';
                        pollTitle = 'Спортивная мафия';
                    }
                }
                if (!pollType) {
                    // Сегодня нет опроса для этой группы
                    const days = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
                    const todayName = days[dayOfWeek];
                    let nextPollInfo = '';
                    if (chatId === cityGroupId) {
                        nextPollInfo = 'Городская мафия проходит по понедельникам, средам и пятницам';
                    }
                    else if (chatId === classicGroupId) {
                        nextPollInfo = 'Спортивная мафия проходит по вторникам, четвергам и субботам';
                    }
                    else {
                        nextPollInfo = 'Эта команда работает только в игровых группах';
                    }
                    await ctx.reply(`ℹ️ Сегодня (${todayName}) нет игрового сбора.\n\n` +
                        `${nextPollInfo}.\n\n` +
                        `⏰ Ждите новый опрос завтра!`, { message_thread_id: threadId });
                    return;
                }
                // Проверяем, есть ли уже опрос на сегодня
                const groupConfig = await this.database.getGroupConfig(targetChatId);
                if (!groupConfig) {
                    await ctx.reply('❌ Группа не найдена в базе данных. Выполните /init');
                    return;
                }
                const todaysPoll = await this.database.getTodaysPoll(groupConfig.id, pollType);
                if (todaysPoll) {
                    // Опрос уже есть, переотправляем
                    await this.pollScheduler.sendPoll(targetChatId, pollType, `${pollTitle} (ПОВТОР)`, threadId);
                    await ctx.reply(`✅ Опрос "${pollTitle}" переотправлен!`, { message_thread_id: threadId });
                }
                else {
                    // Опроса еще нет, создаем новый
                    await this.pollScheduler.sendPoll(targetChatId, pollType, pollTitle, threadId);
                    await ctx.reply(`✅ Опрос "${pollTitle}" создан!`, { message_thread_id: threadId });
                }
            }
            catch (error) {
                console.error('Ошибка при переотправке опроса:', error);
                await ctx.reply('❌ Произошла ошибка при создании опроса');
            }
        });
        // Команда для проверки расписания
        this.bot.command('schedule', async (ctx) => {
            try {
                const today = new Date();
                const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
                const currentDay = days[today.getDay()];
                const dayOfWeek = today.getDay();
                let scheduleText = `📅 **Расписание CityPool Bot**\n\n`;
                scheduleText += `🕐 Время отправки опросов: **${process.env.POLL_TIME || '01:00'} ${process.env.TIMEZONE || 'Europe/Moscow'}**\n\n`;
                // Городская мафия
                scheduleText += `🏙️ **Городская мафия** (TITAN | City, топик "Сборы"):\n`;
                scheduleText += `• Понедельник ${[1].includes(dayOfWeek) ? '← СЕГОДНЯ' : ''}\n`;
                scheduleText += `• Среда ${[3].includes(dayOfWeek) ? '← СЕГОДНЯ' : ''}\n`;
                scheduleText += `• Пятница ${[5].includes(dayOfWeek) ? '← СЕГОДНЯ' : ''}\n\n`;
                // Спортивная мафия
                scheduleText += `⚽ **Спортивная мафия** (TITAN | Classic):\n`;
                scheduleText += `• Вторник ${[2].includes(dayOfWeek) ? '← СЕГОДНЯ' : ''}\n`;
                scheduleText += `• Четверг ${[4].includes(dayOfWeek) ? '← СЕГОДНЯ' : ''}\n`;
                scheduleText += `• Суббота ${[6].includes(dayOfWeek) ? '← СЕГОДНЯ' : ''}\n\n`;
                scheduleText += `📍 Сегодня **${currentDay}** (день ${dayOfWeek}):\n`;
                if ([1, 3, 5].includes(dayOfWeek)) {
                    scheduleText += `✅ Городская мафия будет отправлена в 01:00`;
                }
                else if ([2, 4, 6].includes(dayOfWeek)) {
                    scheduleText += `✅ Спортивная мафия будет отправлена в 01:00`;
                }
                else {
                    scheduleText += `❌ Сегодня нет опросов`;
                }
                scheduleText += `\n\n🔔 Напоминания: 9:00-19:00 для статуса "Я думаю"`;
                await ctx.reply(scheduleText, { parse_mode: 'Markdown' });
            }
            catch (error) {
                console.error('Ошибка при показе расписания:', error);
                await ctx.reply('❌ Произошла ошибка при получении расписания');
            }
        });
        // Команда для диагностики настроек (только для разработчика)
        this.bot.command('debug', async (ctx) => {
            try {
                const cityGroupId = process.env.CITY_GROUP_ID;
                const cityTopicId = process.env.CITY_TOPIC_ID;
                const classicGroupId = process.env.CLASSIC_GROUP_ID;
                const botToken = process.env.BOT_TOKEN;
                const pollTime = process.env.POLL_TIME;
                const timezone = process.env.TIMEZONE;
                let debugText = `🔧 **Диагностика настроек:**\n\n`;
                debugText += `🤖 BOT_TOKEN: ${botToken ? '✅ Установлен' : '❌ НЕ УСТАНОВЛЕН'}\n`;
                debugText += `🏙️ CITY_GROUP_ID: ${cityGroupId || '❌ НЕ УСТАНОВЛЕН'}\n`;
                debugText += `📍 CITY_TOPIC_ID: ${cityTopicId || '❌ НЕ УСТАНОВЛЕН'}\n`;
                debugText += `⚽ CLASSIC_GROUP_ID: ${classicGroupId || '❌ НЕ УСТАНОВЛЕН'}\n`;
                debugText += `🕐 POLL_TIME: ${pollTime || 'по умолчанию (01:00)'}\n`;
                debugText += `🌍 TIMEZONE: ${timezone || 'по умолчанию (Europe/Moscow)'}\n\n`;
                // Проверяем текущее время
                const now = new Date();
                const moscowTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Moscow" }));
                debugText += `⏰ Текущее время в Москве: ${moscowTime.toLocaleTimeString()}\n`;
                debugText += `📅 Текущая дата: ${moscowTime.toLocaleDateString()}\n`;
                debugText += `📍 День недели: ${moscowTime.getDay()} (0=Вс, 1=Пн, ..., 6=Сб)\n\n`;
                // Проверяем базу данных
                try {
                    const groups = await this.database.getAllActiveGroups();
                    debugText += `💾 Групп в БД: ${groups.length}\n`;
                    groups.forEach((group) => {
                        debugText += `  • ${group.groupType}: ${group.chatId}${group.threadId ? ` (топик: ${group.threadId})` : ''}\n`;
                    });
                }
                catch (dbError) {
                    debugText += `💾 БД: ❌ Ошибка подключения\n`;
                }
                await ctx.reply(debugText, { parse_mode: 'Markdown' });
            }
            catch (error) {
                console.error('Ошибка при диагностике:', error);
                await ctx.reply('❌ Произошла ошибка при диагностике');
            }
        });
        // Временная команда для получения ID групп (удалить после настройки)
        this.bot.command('getid', async (ctx) => {
            try {
                const chatId = ctx.chat?.id;
                const threadId = ctx.message?.message_thread_id;
                const chatType = ctx.chat?.type;
                const chatTitle = 'title' in (ctx.chat || {}) ? ctx.chat.title : 'Личные сообщения';
                let idInfo = `🔍 **Информация о чате:**\n\n`;
                idInfo += `📍 Chat ID: \`${chatId}\`\n`;
                idInfo += `📝 Название: ${chatTitle}\n`;
                idInfo += `🏷️ Тип: ${chatType}\n`;
                if (threadId) {
                    idInfo += `🧵 Topic ID: \`${threadId}\`\n`;
                }
                idInfo += `\n💡 **Для .env файла:**\n`;
                if (chatTitle.includes('City') || chatTitle.includes('Город')) {
                    idInfo += `\`CITY_GROUP_ID=${chatId}\`\n`;
                    if (threadId) {
                        idInfo += `\`CITY_TOPIC_ID=${threadId}\`\n`;
                    }
                }
                else if (chatTitle.includes('Classic') || chatTitle.includes('Классик')) {
                    idInfo += `\`CLASSIC_GROUP_ID=${chatId}\`\n`;
                }
                else {
                    idInfo += `Скопируйте ID в соответствующую переменную\n`;
                }
                await ctx.reply(idInfo, { parse_mode: 'Markdown' });
            }
            catch (error) {
                console.error('Ошибка при получении ID:', error);
                await ctx.reply(`Chat ID: ${ctx.chat?.id}\nTopic ID: ${ctx.message?.message_thread_id || 'отсутствует'}`);
            }
        });
    }
    setupMessageHandlers() {
        // Обработчик для удаления технических сообщений
        this.bot.on('message', async (ctx, next) => {
            await this.messageCleaner.handleMessage(ctx);
            return next();
        });
        // Обработчик голосований в опросах
        this.bot.on('poll_answer', async (ctx) => {
            try {
                const pollAnswer = ctx.pollAnswer;
                const user = pollAnswer?.user;
                const pollId = pollAnswer?.poll_id;
                const optionIds = pollAnswer?.option_ids;
                if (!pollId || !optionIds || optionIds.length === 0 || !user)
                    return;
                // Получаем текст выбранного варианта
                const pollOptions = (process.env.POLL_OPTIONS || 'Я приду,Меня не будет,Я думаю,Я опаздаю').split(',');
                const selectedOption = pollOptions[optionIds[0]];
                if (!selectedOption)
                    return;
                console.log(`📊 Голос: ${user.first_name || 'Неизвестный'} (@${user.username || 'без_username'}) выбрал "${selectedOption}" в опросе ${pollId}`);
                // Находим опрос в нашей базе данных
                const pollInfo = await this.database.getPollByTelegramId(pollId);
                if (pollInfo) {
                    // Сохраняем голос в базу данных
                    await this.database.savePollVote(pollInfo.id, user.id, {
                        username: user.username,
                        first_name: user.first_name,
                        last_name: user.last_name
                    }, selectedOption);
                    console.log(`✅ Голос сохранен в БД: пользователь ${user.id} выбрал "${selectedOption}" в опросе ${pollInfo.pollType}`);
                }
                else {
                    console.log(`⚠️ Опрос ${pollId} не найден в базе данных`);
                }
            }
            catch (error) {
                console.error('❌ Ошибка при обработке голосования:', error);
            }
        });
    }
    setupScheduler() {
        // Планируем опросы на 01:00
        const pollTime = process.env.POLL_TIME || '01:00';
        const [hours, minutes] = pollTime.split(':').map(Number);
        // Ежедневная проверка опросов в 01:00
        const pollCronPattern = `${minutes} ${hours} * * *`;
        console.log(`📅 Настроен планировщик опросов: ${pollCronPattern} (${process.env.TIMEZONE || 'Europe/Moscow'})`);
        cron.schedule(pollCronPattern, async () => {
            console.log('🕒 Время проверки и отправки опросов');
            await this.pollScheduler.sendScheduledPolls();
        }, {
            timezone: process.env.TIMEZONE || 'Europe/Moscow'
        });
        // Напоминания каждый час с 9:00 до 18:00
        const reminderEndTime = process.env.REMINDER_END_TIME || '19:00';
        const reminderEndHour = parseInt(reminderEndTime.split(':')[0]);
        console.log(`🔔 Настроены напоминания: каждый час до ${reminderEndHour}:00`);
        // Напоминания каждый час
        cron.schedule('0 * * * *', async () => {
            const currentHour = new Date().getHours();
            if (currentHour >= 9 && currentHour < reminderEndHour) {
                console.log(`🔔 Проверка напоминаний в ${currentHour}:00`);
                await this.reminderService.checkAndSendReminders();
            }
        }, {
            timezone: process.env.TIMEZONE || 'Europe/Moscow'
        });
    }
    setupHealthCheck() {
        // Простой HTTP сервер для health check на Render
        const port = process.env.PORT || 3000;
        const server = http.createServer((req, res) => {
            if (req.url === '/health') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    status: 'ok',
                    timestamp: new Date().toISOString(),
                    uptime: process.uptime()
                }));
            }
            else {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Not Found');
            }
        });
        server.listen(port, () => {
            console.log(`🌐 Health check сервер запущен на порту ${port}`);
        });
    }
    async start() {
        try {
            await this.database.init();
            console.log('✅ База данных инициализирована');
            await this.bot.launch();
            console.log('🤖 Бот запущен');
            // Запускаем службу поддержания активности (только на Render)
            if (process.env.NODE_ENV === 'production') {
                this.keepAliveService.start();
            }
            // Graceful shutdown
            process.once('SIGINT', async () => {
                console.log('⏹️ Получен сигнал SIGINT, останавливаем бота...');
                await this.stop();
            });
            process.once('SIGTERM', async () => {
                console.log('⏹️ Получен сигнал SIGTERM, останавливаем бота...');
                await this.stop();
            });
        }
        catch (error) {
            console.error('❌ Ошибка при запуске бота:', error);
            process.exit(1);
        }
    }
    async stop() {
        try {
            this.bot.stop();
            await this.database.close();
            console.log('✅ Бот остановлен');
            process.exit(0);
        }
        catch (error) {
            console.error('❌ Ошибка при остановке бота:', error);
            process.exit(1);
        }
    }
}
// Запускаем бота
const bot = new CityPoolBot();
bot.start();
//# sourceMappingURL=index.js.map