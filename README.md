# Canvas Editor — React + React Flow

Редактор на React Flow с нодами «текст → генератор → результат»: сборка графа на канвасе, имитация генерации изображения, сохранение графа через REST. React 19 + TypeScript + Vite.

## Возможности

- Канвас на React Flow: ноды трёх типов — текст, генератор, результат
- Связывание и перетаскивание нод, панель действий (Toolbar)
- Автосохранение графа на сервер (`useAutoSave`)
- Запуск генерации с опросом статуса (`useGeneration`)
- Загрузка сохранённого графа при старте (`useGraphLoader`)
- Единый HTTP-клиент с централизованной обработкой ошибок

## Структура фронтенда (apps/web/src)

```text
api/           # HTTP-клиент и endpoints: spaces, graph, generations
components/    # Canvas, Toolbar, кастомные ноды (nodes/)
hooks/         # useAutoSave, useGeneration, useGraphLoader
store.ts       # состояние приложения
types.ts       # типы графа и нод
```

## Запуск

Потребуются Node.js 24.x и npm 11.x. База данных и ключи внешних сервисов не нужны.

```sh
git clone https://github.com/Saga6569/frontend-canvas-solution.git
cd frontend-canvas-solution
npm ci
npm run dev        # API на :4001
# в другом терминале:
npm run dev:web    # фронтенд
```

Swagger API: [http://localhost:4001/docs/](http://localhost:4001/docs/). Спецификация: [http://localhost:4001/openapi.json](http://localhost:4001/openapi.json) и [файл в репозитории](docs/openapi.json).

Проект использует npm workspaces: `apps/api` — бэкенд, `apps/web` — фронтенд (`@canvas/web`), `packages/contracts` — схемы API и типы TypeScript.

## Настройки

Адрес API по умолчанию — `127.0.0.1:4001`. При необходимости скопируйте `.env.example` в `.env` и измените `PORT`. Данные сохраняются в `.data/store.json`; для сброса остановите сервер и выполните `npm run data:reset`.

Генерация тестовая: после заданной задержки сервер возвращает локальное SVG-изображение или ошибку сценария. Внешних запросов нет.

## Проверки

```sh
npm run check   # форматирование, сборка, тесты, OpenAPI
npm run build
npm run smoke   # проверка API по HTTP (API должен работать)
```
