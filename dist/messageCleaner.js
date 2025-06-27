"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageCleaner = void 0;
class MessageCleaner {
    constructor(bot) {
        this.bot = bot;
        // Шаблоны для определения технических сообщений
        this.technicalMessagePatterns = [
            /закрепил.*сообщение/i,
            /pinned.*message/i,
            /открепил.*сообщение/i,
            /unpinned.*message/i,
            /изменил.*название/i,
            /changed.*title/i,
            /добавил.*участник/i,
            /added.*member/i,
            /исключил.*участник/i,
            /removed.*member/i,
            /покинул.*группу/i,
            /left.*group/i,
            /присоединился.*группе/i,
            /joined.*group/i
        ];
    }
    async handleMessage(ctx) {
        try {
            // Проверяем только служебные сообщения
            if (!this.isServiceMessage(ctx)) {
                return;
            }
            const messageText = this.getMessageText(ctx);
            if (!messageText) {
                return;
            }
            // Проверяем, является ли сообщение техническим
            if (this.isTechnicalMessage(messageText)) {
                await this.deleteMessage(ctx);
            }
        }
        catch (error) {
            console.error('❌ Ошибка в MessageCleaner:', error);
        }
    }
    isServiceMessage(ctx) {
        const message = ctx.message;
        if (!message)
            return false;
        // Проверяем различные типы служебных сообщений
        return !!('pinned_message' in message ||
            'new_chat_members' in message ||
            'left_chat_member' in message ||
            'new_chat_title' in message ||
            'new_chat_photo' in message ||
            'delete_chat_photo' in message ||
            'group_chat_created' in message ||
            'supergroup_chat_created' in message ||
            'channel_chat_created' in message ||
            'migrate_to_chat_id' in message ||
            'migrate_from_chat_id' in message);
    }
    getMessageText(ctx) {
        const message = ctx.message;
        if (!message)
            return null;
        // Получаем текст из различных типов сообщений
        if ('text' in message) {
            return message.text;
        }
        if ('caption' in message) {
            return message.caption || null;
        }
        // Для служебных сообщений пытаемся получить системный текст
        if ('pinned_message' in message) {
            return 'закрепил сообщение';
        }
        if ('new_chat_members' in message) {
            return 'добавил участника';
        }
        if ('left_chat_member' in message) {
            return 'покинул группу';
        }
        if ('new_chat_title' in message) {
            return 'изменил название';
        }
        return null;
    }
    isTechnicalMessage(text) {
        return this.technicalMessagePatterns.some(pattern => pattern.test(text));
    }
    async deleteMessage(ctx) {
        try {
            const chatId = ctx.chat?.id;
            const messageId = ctx.message?.message_id;
            if (!chatId || !messageId) {
                return;
            }
            // Добавляем небольшую задержку перед удалением
            setTimeout(async () => {
                try {
                    await this.bot.telegram.deleteMessage(chatId, messageId);
                    console.log(`🗑️ Удалено техническое сообщение ${messageId} в чате ${chatId}`);
                }
                catch (deleteError) {
                    console.error(`❌ Не удалось удалить сообщение ${messageId}:`, deleteError);
                }
            }, 2000); // Задержка 2 секунды
        }
        catch (error) {
            console.error('❌ Ошибка при удалении технического сообщения:', error);
        }
    }
    async cleanupPinnedMessages(chatId, excludeMessageId) {
        try {
            // Telegram не предоставляет API для получения списка закрепленных сообщений
            // Поэтому мы можем только открепить все сообщения и закрепить нужное
            // Открепляем все сообщения
            await this.bot.telegram.unpinAllChatMessages(chatId);
            // Если есть исключение, закрепляем его обратно
            if (excludeMessageId) {
                await this.bot.telegram.pinChatMessage(chatId, excludeMessageId, {
                    disable_notification: true
                });
            }
            console.log(`🧹 Очищены закрепленные сообщения в чате ${chatId}`);
        }
        catch (error) {
            console.error(`❌ Ошибка при очистке закрепленных сообщений в чате ${chatId}:`, error);
        }
    }
}
exports.MessageCleaner = MessageCleaner;
//# sourceMappingURL=messageCleaner.js.map