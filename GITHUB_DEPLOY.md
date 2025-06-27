# Публикация проекта на GitHub

## Шаги для публикации

1. **Создайте новый репозиторий на GitHub:**
   - Перейдите на https://github.com/new
   - Название: `citypool-telegram-bot`
   - Описание: `Telegram bot for automated poll scheduling in TITAN groups`
   - Выберите **Public** (публичный репозиторий)
   - ❌ **НЕ ДОБАВЛЯЙТЕ** README, .gitignore или LICENSE (они уже есть в проекте)
   - Нажмите **Create repository**

2. **Свяжите локальный репозиторий с GitHub:**
   ```bash
   git remote add origin https://github.com/ВАШ_USERNAME/citypool-telegram-bot.git
   git branch -M main
   git push -u origin main
   ```

## Важно для безопасности

- ✅ Файл `.env` уже добавлен в `.gitignore` - секретные данные не попадут в репозиторий
- ✅ Файл `.env.example` содержит шаблон без реальных токенов
- ✅ В коде нет захардкоженных токенов или ID

## После публикации

Ваш бот будет доступен по адресу:
```
https://github.com/ВАШ_USERNAME/citypool-telegram-bot
```

## Деплой на Render

После публикации на GitHub вы сможете:
1. Подключить репозиторий к Render.com
2. Использовать автоматический деплой при каждом push
3. Настроить переменные окружения в панели Render

## Команды git для обновления

После внесения изменений:
```bash
git add .
git commit -m "Описание изменений"
git push
```
