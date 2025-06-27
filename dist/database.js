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
exports.Database = void 0;
const sqlite3_1 = __importDefault(require("sqlite3"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class Database {
    constructor() {
        // В production на Render используем постоянный диск
        if (process.env.NODE_ENV === 'production') {
            this.dbPath = '/opt/render/project/data/database.sqlite';
        }
        else {
            this.dbPath = process.env.DATABASE_PATH || './database.sqlite';
        }
        console.log(`📊 Путь к базе данных: ${this.dbPath}`);
    }
    async init() {
        return new Promise((resolve, reject) => {
            // Создаем директорию для базы данных если её нет
            const dbDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
                console.log(`📁 Создана директория для БД: ${dbDir}`);
            }
            this.db = new sqlite3_1.default.Database(this.dbPath, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                console.log('📊 Подключен к SQLite базе данных');
                this.createTables().then(resolve).catch(reject);
            });
        });
    }
    async createTables() {
        const createGroupsTable = `
      CREATE TABLE IF NOT EXISTS groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id INTEGER UNIQUE NOT NULL,
        thread_id INTEGER,
        group_type TEXT NOT NULL CHECK(group_type IN ('city', 'classic')),
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
        const createPollsTable = `
      CREATE TABLE IF NOT EXISTS polls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id INTEGER NOT NULL,
        message_id INTEGER NOT NULL,
        poll_date DATE NOT NULL,
        poll_type TEXT NOT NULL CHECK(poll_type IN ('city', 'classic')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES groups (id)
      )
    `;
        const createPollVotesTable = `
      CREATE TABLE IF NOT EXISTS poll_votes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        poll_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        username TEXT,
        first_name TEXT,
        last_name TEXT,
        option_text TEXT NOT NULL,
        voted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_reminder_at DATETIME,
        FOREIGN KEY (poll_id) REFERENCES polls (id),
        UNIQUE(poll_id, user_id)
      )
    `;
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                this.db.run(createGroupsTable, (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                });
                this.db.run(createPollsTable, (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                });
                this.db.run(createPollVotesTable, (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve();
                });
            });
        });
    }
    async saveGroupConfig(chatId, groupType, threadId) {
        const query = `
      INSERT OR REPLACE INTO groups (chat_id, thread_id, group_type, is_active, updated_at)
      VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
    `;
        return new Promise((resolve, reject) => {
            this.db.run(query, [chatId, threadId || null, groupType], (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                console.log(`✅ Сохранена конфигурация группы: ${chatId} (${groupType})${threadId ? ` (топик: ${threadId})` : ''}`);
                resolve();
            });
        });
    }
    async getGroupConfig(chatId) {
        const query = `
      SELECT * FROM groups WHERE chat_id = ? AND is_active = 1
    `;
        return new Promise((resolve, reject) => {
            this.db.get(query, [chatId], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (!row) {
                    resolve(null);
                    return;
                }
                resolve({
                    id: row.id,
                    chatId: row.chat_id,
                    threadId: row.thread_id,
                    groupType: row.group_type,
                    isActive: Boolean(row.is_active),
                    createdAt: row.created_at,
                    updatedAt: row.updated_at
                });
            });
        });
    }
    async getAllActiveGroups() {
        const query = `
      SELECT * FROM groups WHERE is_active = 1
    `;
        return new Promise((resolve, reject) => {
            this.db.all(query, [], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                const groups = rows.map(row => ({
                    id: row.id,
                    chatId: row.chat_id,
                    threadId: row.thread_id,
                    groupType: row.group_type,
                    isActive: Boolean(row.is_active),
                    createdAt: row.created_at,
                    updatedAt: row.updated_at
                }));
                resolve(groups);
            });
        });
    }
    async savePoll(groupId, messageId, pollType, pollDate) {
        const query = `
      INSERT INTO polls (group_id, message_id, poll_type, poll_date)
      VALUES (?, ?, ?, ?)
    `;
        return new Promise((resolve, reject) => {
            this.db.run(query, [groupId, messageId, pollType, pollDate], function (err) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(this.lastID);
            });
        });
    }
    async savePollVote(pollId, userId, userInfo, option) {
        const query = `
      INSERT OR REPLACE INTO poll_votes (poll_id, user_id, username, first_name, last_name, option_text, voted_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;
        return new Promise((resolve, reject) => {
            this.db.run(query, [
                pollId,
                userId,
                userInfo.username,
                userInfo.first_name,
                userInfo.last_name,
                option
            ], (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    }
    async getThinkingVoters(pollId) {
        const query = `
      SELECT * FROM poll_votes 
      WHERE poll_id = ? AND option_text = 'Я думаю'
      ORDER BY voted_at DESC
    `;
        return new Promise((resolve, reject) => {
            this.db.all(query, [pollId], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                const votes = rows.map(row => ({
                    id: row.id,
                    pollId: row.poll_id,
                    userId: row.user_id,
                    username: row.username,
                    firstName: row.first_name,
                    lastName: row.last_name,
                    option: row.option_text,
                    votedAt: row.voted_at,
                    lastReminderAt: row.last_reminder_at
                }));
                resolve(votes);
            });
        });
    }
    async updateLastReminder(voteId) {
        const query = `
      UPDATE poll_votes 
      SET last_reminder_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
        return new Promise((resolve, reject) => {
            this.db.run(query, [voteId], (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    }
    async getTodaysPoll(groupId, pollType) {
        const today = new Date().toISOString().split('T')[0];
        const query = `
      SELECT id, message_id FROM polls 
      WHERE group_id = ? AND poll_type = ? AND poll_date = ?
      ORDER BY created_at DESC 
      LIMIT 1
    `;
        return new Promise((resolve, reject) => {
            this.db.get(query, [groupId, pollType, today], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (!row) {
                    resolve(null);
                    return;
                }
                resolve({
                    id: row.id,
                    messageId: row.message_id
                });
            });
        });
    }
    async getPollByTelegramId(telegramPollId) {
        const query = `
      SELECT p.id, p.group_id, p.poll_type 
      FROM polls p 
      WHERE p.message_id = ? 
      ORDER BY p.created_at DESC 
      LIMIT 1
    `;
        return new Promise((resolve, reject) => {
            this.db.get(query, [telegramPollId], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (!row) {
                    resolve(null);
                    return;
                }
                resolve({
                    id: row.id,
                    groupId: row.group_id,
                    pollType: row.poll_type
                });
            });
        });
    }
    async close() {
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err) {
                    reject(err);
                    return;
                }
                console.log('📊 Соединение с базой данных закрыто');
                resolve();
            });
        });
    }
}
exports.Database = Database;
//# sourceMappingURL=database.js.map