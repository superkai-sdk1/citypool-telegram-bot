import { Telegraf, Context } from 'telegraf';
import { Database } from './database';
export declare class PollScheduler {
    private bot;
    private database;
    private pollOptions;
    constructor(bot: Telegraf<Context>, database: Database);
    sendScheduledPolls(): Promise<void>;
    private sendPollByType;
    sendPoll(chatId: number, pollType: 'city' | 'classic', title: string, threadId?: number): Promise<void>;
    private generatePollTitle;
    unpinLastPoll(chatId: number): Promise<void>;
}
//# sourceMappingURL=pollScheduler.d.ts.map