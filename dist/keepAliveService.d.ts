export declare class KeepAliveService {
    private serviceUrl;
    constructor();
    /**
     * Запускает службу поддержания активности
     * Пингует health endpoint каждые 14 минут, чтобы предотвратить засыпание
     */
    start(): void;
    /**
     * Выполняет ping health endpoint
     */
    private ping;
    /**
     * Останавливает службу поддержания активности
     */
    stop(): void;
}
//# sourceMappingURL=keepAliveService.d.ts.map