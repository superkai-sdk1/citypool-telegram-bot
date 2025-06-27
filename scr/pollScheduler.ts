import { Telegraf, Context } from 'telegraf';
import { Database, GroupConfig } from './database';

export class PollScheduler {
  private bot: Telegraf<Context>;
  private database: Database;
  private pollOptions: string[];

  constructor(bot: Telegraf<Context>, database: Database) {
    this.bot = bot;
    this.database = database;
    this.pollOptions = (process.env.POLL_OPTIONS || 'Я приду,Меня не будет,Я думаю,Я опаздаю').split(',');
  }

  public async sendScheduledPolls(): Promise<void> {
    try {
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 = воскресенье, 1 = понедельник...
      
      // Определяем какие опросы отправлять
      const pollsToSend: Array<{type: 'city' | 'classic', title: string}> = [];
      
      // Городская мафия: Понедельник (1), Среда (3), Пятница (5)
      if ([1, 3, 5].includes(dayOfWeek)) {
        pollsToSend.push({
          type: 'city',
          title: process.env.CITY_POLL_QUESTION || 'Городская мафия'
        });
      }
      
      // Спортивная мафия: Вторник (2), Четверг (4), Суббота (6)
      if ([2, 4, 6].includes(dayOfWeek)) {
        pollsToSend.push({
          type: 'classic',
          title: process.env.CLASSIC_POLL_QUESTION || 'Спортивная мафия'
        });
      }

      console.log(`📋 Отправка опросов на ${today.toLocaleDateString()}: ${pollsToSend.map(p => p.title).join(', ')}`);

      for (const pollInfo of pollsToSend) {
        await this.sendPollByType(pollInfo.type, pollInfo.title);
      }
    } catch (error) {
      console.error('❌ Ошибка при отправке запланированных опросов:', error);
    }
  }

  private async sendPollByType(pollType: 'city' | 'classic', title: string): Promise<void> {
    try {
      let chatId: number;
      let threadId: number | undefined;

      // Определяем куда отправлять опрос
      if (pollType === 'city') {
        chatId = parseInt(process.env.CITY_GROUP_ID || '0');
        threadId = process.env.CITY_TOPIC_ID ? parseInt(process.env.CITY_TOPIC_ID) : undefined;
      } else {
        chatId = parseInt(process.env.CLASSIC_GROUP_ID || '0');
        threadId = undefined;
      }

      if (!chatId) {
        console.error(`❌ Не указан ID группы для типа ${pollType}`);
        return;
      }

      await this.sendPoll(chatId, pollType, title, threadId);
    } catch (error) {
      console.error(`❌ Ошибка при отправке опроса ${pollType}:`, error);
    }
  }

  public async sendPoll(chatId: number, pollType: 'city' | 'classic', title: string, threadId?: number): Promise<void> {
    try {
      const today = new Date();
      const pollTitle = this.generatePollTitle(title, today);

      // Отправляем опрос
      const pollMessage = await this.bot.telegram.sendPoll(
        chatId,
        pollTitle,
        this.pollOptions,
        {
          is_anonymous: false,
          allows_multiple_answers: false,
          message_thread_id: threadId,
          reply_markup: undefined
        }
      );

      // Закрепляем сообщение с опросом С УВЕДОМЛЕНИЯМИ
      try {
        await this.bot.telegram.pinChatMessage(chatId, pollMessage.message_id, {
          disable_notification: false // Включаем уведомления для всех участников
        });
        console.log(`📌 Опрос закреплен в группе ${chatId} с уведомлениями`);

        // Удаляем системное сообщение о закреплении через 3 секунды
        setTimeout(async () => {
          try {
            // Простая попытка найти и удалить системное сообщение
            // В реальности это сложно без webhook'ов, поэтому полагаемся на MessageCleaner
            console.log('🧹 Ожидание очистки системного сообщения...');
          } catch (deleteError) {
            console.log('🔍 MessageCleaner обработает системные сообщения');
          }
        }, 3000);

      } catch (pinError) {
        console.error(`❌ Не удалось закрепить опрос в группе ${chatId}:`, pinError);
      }

      // Сохраняем информацию о опросе в базу данных
      const groupConfig = await this.database.getGroupConfig(chatId);
      if (groupConfig) {
        await this.database.savePoll(
          groupConfig.id,
          pollMessage.message_id,
          pollType,
          today.toISOString().split('T')[0]
        );
      }

    } catch (error) {
      console.error(`❌ Ошибка при отправке опроса в группу ${chatId}:`, error);
      throw error;
    }
  }

  private generatePollTitle(pollTitle: string, date: Date): string {
    const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    const dayName = days[date.getDay()];
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    
    return `${pollTitle} ${dayName} | ${day}/${month}`;
  }

  public async unpinLastPoll(chatId: number): Promise<void> {
    try {
      // Открепляем все сообщения в чате
      await this.bot.telegram.unpinAllChatMessages(chatId);
      console.log(`📌 Открепили все предыдущие сообщения в группе ${chatId}`);
    } catch (error) {
      console.error(`❌ Ошибка при открепление предыдущих сообщений:`, error);
    }
  }
}
