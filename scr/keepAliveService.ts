import * as cron from 'node-cron';
import https from 'https';

export class KeepAliveService {
  private serviceUrl: string;

  constructor() {
    // URL вашего сервиса на Render (будет установлен через переменную окружения)
    this.serviceUrl = process.env.RENDER_SERVICE_URL || '';
  }

  /**
   * Запускает службу поддержания активности
   * Пингует health endpoint каждые 14 минут, чтобы предотвратить засыпание
   */
  public start() {
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
  private async ping() {
    try {
      const url = `${this.serviceUrl}/health`;
      
      const request = https.get(url, (response) => {
        let data = '';
        
        response.on('data', (chunk) => {
          data += chunk;
        });

        response.on('end', () => {
          if (response.statusCode === 200) {
            console.log('🔄 Self-ping успешен');
          } else {
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
      
    } catch (error) {
      console.error('❌ Ошибка при выполнении self-ping:', error);
    }
  }

  /**
   * Останавливает службу поддержания активности
   */
  public stop() {
    console.log('⏹️ Служба поддержания активности остановлена');
  }
}
