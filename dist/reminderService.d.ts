import { Telegraf, Context } from 'telegraf';
import { Database } from './database';
export declare class ReminderService {
    private bot;
    private database;
    private reminderEndHour;
    constructor(bot: Telegraf<Context>, database: Database);
    checkAndSendReminders(): Promise<void>;
    private processRemindersForGroup;
    private sendGroupReminder;
}
//# sourceMappingURL=reminderService.d.ts.map