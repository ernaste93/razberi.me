# Разбери.ме — AI учебен MVP

Basic web prototype за AI помощник за учене: landing page, демо урок, маркиране на неясен текст, плаващ чат „Цъкни за помощ“ и server-side OpenAI endpoint.

## Локално стартиране

1. Инсталирай Node.js 18+.
2. Разархивирай проекта.
3. Копирай `.env.example` като `.env`.
4. В `.env` сложи твоя OpenAI API key:

```bash
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4.1-mini
PORT=3000
```

5. Стартирай:

```bash
npm start
```

6. Отвори:

```text
http://localhost:3000
```

Проверка на backend:

```text
http://localhost:3000/api/health
```

## Важно за API ключа

Не слагай `OPENAI_API_KEY` в `index.html`, `app.js` или друг frontend файл. Ключът трябва да стои само в `.env` локално или като environment variable в hosting платформата.

## Deploy вариант 1: Render + Porkbun

Това е най-лесно за сегашния Node проект.

1. Създай GitHub repo и качи файловете.
2. В Render избери **New Web Service**.
3. Свържи GitHub repo-то.
4. Настройки:
   - Build command: `npm install`
   - Start command: `npm start`
   - Environment: Node
5. В Render добави environment variable:
   - `OPENAI_API_KEY` = твоя OpenAI API key
   - `OPENAI_MODEL` = `gpt-4.1-mini`
6. Deploy.
7. В Render → Settings / Custom Domains добави:
   - `razberi.me`
   - `www.razberi.me`
8. Render ще покаже DNS records. В Porkbun → Domain Management → Details → DNS Records добави тези records.

Обикновено `www` се насочва с CNAME към Render subdomain, а root домейнът `razberi.me` се насочва според точните инструкции, които Render показва в dashboard-а.

## Deploy вариант 2: само demo без AI

Може да качиш `index.html`, `styles.css` и `app.js` на Netlify/Vercel като статичен сайт, но реалният AI endpoint няма да работи без backend.

## Какво има вътре

- `index.html` — frontend
- `styles.css` — дизайн
- `app.js` — UI логика + AI calls + fallback demo
- `server.js` — Node backend + OpenAI proxy
- `.env.example` — примерни environment variables
- `render.yaml` — примерна Render blueprint конфигурация

## Следващи стъпки

- Истински landing copy за `razberi.me`
- Early access форма
- Първи реален урок/модул
- Login и progress по ученици
- Database за уроци, въпроси и чат история
