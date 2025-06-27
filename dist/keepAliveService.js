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
exports.KeepAliveService = void 0;
const cron = __importStar(require("node-cron"));
const https_1 = __importDefault(require("https"));
class KeepAliveService {
    constructor() {
        // URL вашего сервиса на Render (будет установлен через переменную окружения)
        this.serviceUrl = process.env.RENDER_SERVICE_URL || '';
    }
    /**
     * Запускает службу поддержания активности
     * Пингует health endpoint каждые 14 минут, чтобы предотвратить засыпание
     */
    start() {
        if (!this.serviceUrl) {
            console.log('🔄 RENDER_SERVICE_URL не установлен, self-ping отключен');
            return;
        }
        console.log('🔄 Запуск службы поддержания активности');
        console.log(`📍 URL сервиса: ${this.serviceUrl}`);
        // Пингуем каждые 14 минут (меньше 15-минутного лимита Render)
        cron.schedule('*/14 * * * *', async () => {
            await this.ping();
        }, {
            timezone: process.env.TIMEZONE || 'Europe/Moscow'
        });
        console.log('✅ Служба поддержания активности настроена (каждые 14 минут)');
    }
    /**
     * Выполняет ping health endpoint
     */
    async ping() {
        try {
            const url = `${this.serviceUrl}/health`;
            const request = https_1.default.get(url, (response) => {
                let data = '';
                response.on('data', (chunk) => {
                    data += chunk;
                });
                response.on('end', () => {
                    if (response.statusCode === 200) {
                        console.log('🔄 Self-ping успешен');
                    }
                    else {
                        console.log(`⚠️ Self-ping: статус ${response.statusCode}`);
                    }
                });
            });
            request.on('error', (error) => {
                console.error('❌ Ошибка self-ping:', error.message);
            });
            request.setTimeout(10000, () => {
                console.error('⏰ Таймаут self-ping');
                request.destroy();
            });
        }
        catch (error) {
            console.error('❌ Ошибка при выполнении self-ping:', error);
        }
    }
    /**
     * Останавливает службу поддержания активности
     */
    stop() {
        console.log('⏹️ Служба поддержания активности остановлена');
    }
}
exports.KeepAliveService = KeepAliveService;
//# sourceMappingURL=keepAliveService.js.map