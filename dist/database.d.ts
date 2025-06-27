export interface GroupConfig {
    id: number;
    chatId: number;
    threadId?: number;
    groupType: 'city' | 'classic';
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface PollVote {
    id: number;
    pollId: number;
    userId: number;
    username?: string;
    firstName?: string;
    lastName?: string;
    option: string;
    votedAt: string;
    lastReminderAt?: string;
}
export declare class Database {
    private db;
    private dbPath;
    constructor();
    init(): Promise<void>;
    private createTables;
    saveGroupConfig(chatId: number, groupType: 'city' | 'classic', threadId?: number): Promise<void>;
    getGroupConfig(chatId: number): Promise<GroupConfig | null>;
    getAllActiveGroups(): Promise<GroupConfig[]>;
    savePoll(groupId: number, messageId: number, pollType: 'city' | 'classic', pollDate: string): Promise<number>;
    savePollVote(pollId: number, userId: number, userInfo: any, option: string): Promise<void>;
    getThinkingVoters(pollId: number): Promise<PollVote[]>;
    updateLastReminder(voteId: number): Promise<void>;
    getTodaysPoll(groupId: number, pollType: 'city' | 'classic'): Promise<{
        id: number;
        messageId: number;
    } | null>;
    getPollByTelegramId(telegramPollId: string): Promise<{
        id: number;
        groupId: number;
        pollType: 'city' | 'classic';
    } | null>;
    close(): Promise<void>;
}
//# sourceMappingURL=database.d.ts.map