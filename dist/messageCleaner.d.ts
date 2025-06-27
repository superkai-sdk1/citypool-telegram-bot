import { Telegraf, Context } from 'telegraf';
export declare class MessageCleaner {
    private bot;
    private technicalMessagePatterns;
    constructor(bot: Telegraf<Context>);
    handleMessage(ctx: Context): Promise<void>;
    private isServiceMessage;
    private getMessageText;
    private isTechnicalMessage;
    private deleteMessage;
    cleanupPinnedMessages(chatId: number, excludeMessageId?: number): Promise<void>;
}
//# sourceMappingURL=messageCleaner.d.ts.map