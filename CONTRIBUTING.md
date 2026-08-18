# Разработка

## Проверки

Те же команды гоняет CI (`.github/workflows/ci.yml`) на каждый push в `main`
и на каждый pull request — плюс сборку обоих Docker-образов.

```bash
cd frontend && npm ci && npm run lint && npm test && npm run build
```

```bash
cd backend && npm ci && npm run lint && npm run prisma:generate && npm test && npm run build
```

`next build` сам прогоняет TypeScript и заодно генерирует `next-env.d.ts`,
поэтому отдельный `npm run typecheck` во фронтенде имеет смысл только после
хотя бы одной сборки.

## Где живёт API

Единственная реализация каждого эндпоинта — в бэкенде. Фронтенд не держит
route handlers под `src/app/api`: в проде nginx отдаёт весь `/api/` бэкенду, а
локально то же самое делает rewrite в `next.config.ts`. Исключение —
`src/app/admin-api/*`: это серверная прослойка админки, которая добавляет к
запросу секрет и никогда не уходит в браузер.

## Внутренние страницы

`/lang` (сверка переводов) и `/habits` (трекер привычек) — служебные. В
development они открыты, в production отдают 404. `noindex` в их метаданных
просил краулеры не заходить, но никого не останавливал; теперь вернуть их
может только сборка с `ENABLE_INTERNAL_TOOLS=true`.

## Доступ в админке

Администраторы хранятся в базе, а не в `.env`; сессия — подписанная кука, из
которой берётся только id учётной записи. Границу авторизации держат
`requireAdminSection(locale, section, level)` и `requireSuperAdmin(locale)` из
`frontend/src/lib/adminAuthServer.ts`: их вызывает **каждая** страница админки и
**каждый** server action. Скрытая в UI кнопка ничего не защищает — новый экран
или action без такой проверки открыт любому вошедшему администратору.

Уровни доступа к разделу: `none`, `view`, `manage`. Страницы-списки требуют
`view`, формы и мутации — `manage`.
