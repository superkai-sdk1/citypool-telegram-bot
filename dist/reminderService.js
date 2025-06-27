"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReminderService = void 0;
class ReminderService {
    constructor(bot, database) {
        this.bot = bot;
        this.database = database;
        // Парсим время окончания напоминаний (по умолчанию 19:00)
        const endTime = process.env.REMINDER_END_TIME || '19:00';
        this.reminderEndHour = parseInt(endTime.split(':')[0]);
    }
    async checkAndSendReminders() {
        try {
            const currentHour = new Date().getHours();
            // Проверяем, не пора ли прекратить напоминания
            if (currentHour >= this.reminderEndHour) {
                console.log(`⏰ Время напоминаний закончилось (${this.reminderEndHour}:00)`);
                return;
            }
            // Получаем активные опросы за сегодня
            const today = new Date().toISOString().split('T')[0];
            // Проверяем опросы для обеих групп
            await this.processRemindersForGroup('city');
            await this.processRemindersForGroup('classic');
        }
        catch (error) {
            console.error('❌ Ошибка при проверке напоминаний:', error);
        }
    }
    async processRemindersForGroup(groupType) {
        try {
            let chatId;
            let threadId;
            // Определяем ID группы
            if (groupType === 'city') {
                chatId = parseInt(process.env.CITY_GROUP_ID || '0');
                threadId = process.env.CITY_TOPIC_ID ? parseInt(process.env.CITY_TOPIC_ID) : undefined;
            }
            else {
                chatId = parseInt(process.env.CLASSIC_GROUP_ID || '0');
                threadId = undefined;
            }
            if (!chatId)
                return;
            // Получаем конфигурацию группы
            const groupConfig = await this.database.getGroupConfig(chatId);
            if (!groupConfig)
                return;
            // Получаем сегодняшний опрос
            const todaysPoll = await this.database.getTodaysPoll(groupConfig.id, groupType);
            if (!todaysPoll)
                return;
            // Получаем всех, кто отметился как "Я думаю"
            const thinkingVoters = await this.database.getThinkingVoters(todaysPoll.id);
            if (thinkingVoters.length === 0) {
                console.log(`ℹ️ Нет участников в статусе "Я думаю" для группы ${groupType}`);
                return;
            }
            // Фильтруем тех, кому еще не отправляли напоминание в этом часу
            const votersToRemind = thinkingVoters.filter(voter => {
                if (!voter.lastReminderAt)
                    return true;
                const lastReminder = new Date(voter.lastReminderAt);
                const currentTime = new Date();
                const timeDiff = currentTime.getTime() - lastReminder.getTime();
                const hoursDiff = timeDiff / (1000 * 60 * 60);
                // Отправляем напоминание только если прошел час или больше
                return hoursDiff >= 1;
            });
            if (votersToRemind.length === 0) {
                console.log(`ℹ️ Всем участникам группы ${groupType} уже отправлены напоминания в этом часу`);
                return;
            }
            // Отправляем напоминания
            await this.sendGroupReminder(chatId, threadId, votersToRemind, groupType);
            // Обновляем время последнего напоминания
            for (const voter of votersToRemind) {
                await this.database.updateLastReminder(voter.id);
            }
        }
        catch (error) {
            console.error(`❌ Ошибка при обработке напоминаний для группы ${groupType}:`, error);
        }
    }
    async sendGroupReminder(chatId, threadId, voters, groupType) {
        try {
            // Формируем список упоминаний
            const mentions = voters.map(voter => {
                if (voter.username) {
                    return `@${voter.username}`;
                }
                else {
                    // Для пользователей без username используем ссылку на профиль
                    const displayName = `${voter.firstName || 'Участник'}${voter.lastName ? ` ${voter.lastName}` : ''}`;
                    return `[${displayName}](tg://user?id=${voter.userId})`;
                }
            }).join(', ');
            const pollName = groupType === 'city' ? 'Городская мафия' : 'Спортивная мафия';
            const groupName = groupType === 'city' ? 'TITAN | City' : 'TITAN | Classic';
            const reminderText = `🤔 ${mentions}\n\nПора принять решение по опросу "${pollName}" в ${groupName}!\nВаш текущий статус: "Я думаю"`;
            // Отправляем напоминание в соответствующую группу
            await this.bot.telegram.sendMessage(chatId, reminderText, {
                message_thread_id: threadId,
                parse_mode: 'Markdown'
            });
            console.log(`💬 Отправлено напоминание для ${voters.length} участников в группе ${groupName} (${groupType})`);
        }
        catch (error) {
            console.error('❌ Ошибка при отправке напоминания:', error);
            // Если ошибка с Markdown, попробуем без форматирования
            try {
                const mentions = voters.map(voter => {
                    if (voter.username) {
                        return `@${voter.username}`;
                    }
                    else {
                        return `${voter.firstName || 'Участник'}${voter.lastName ? ` ${voter.lastName}` : ''}`;
                    }
                }).join(', ');
                const pollName = groupType === 'city' ? 'Городская мафия' : 'Спортивная мафия';
                const reminderText = `🤔 ${mentions}\n\nПора принять решение по опросу "${pollName}"!\nВаш текущий статус: "Я думаю"`;
                await this.bot.telegram.sendMessage(chatId, reminderText, {
                    message_thread_id: threadId
                });
                console.log(`💬 Отправлено напоминание (без форматирования) для ${voters.length} участников в группе ${groupType}`);
            }
            catch (secondError) {
                console.error('❌ Критическая ошибка при отправке напоминания:', secondError);
            }
        }
    }
}
exports.ReminderService = ReminderService;
//# sourceMappingURL=reminderService.js.map