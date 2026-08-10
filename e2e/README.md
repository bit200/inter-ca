# e2e

Playwright-тесты для `admin`. Запускаются **вручную**, не в CI (см.
`../E2E_TEST_PLAN.md` — почему).

## Установка

```bash
cd e2e
npm install
npm run install-browsers   # один раз, ставит headless Chromium
```

## Запуск

Приложение (`admin`) должно быть уже поднято локально (`npm start` в `admin/`,
обычно `http://localhost:3000`).

```bash
E2E_USERNAME=... E2E_PASSWORD=... npm test        # все тесты, headless
npm run test:ui                                    # с UI-раннером Playwright (удобно отлаживать)
npm run test:headed                                 # с видимым браузером
npm run report                                      # открыть html-отчёт последнего прогона
```

Креды тестового пользователя нигде в репозитории не хранятся — только через env
(или локальный `e2e/.env`, он в `.gitignore`, `require('dotenv').config()` пока не
подключен — добавить при необходимости, `dotenv` уже используется в бэкенде так что
пакет знакомый).

Другой домен вместо `localhost:3000` — `E2E_BASE_URL=https://staging-app.itk.academy npm test`.

## Конвенция testid

- `data-testid="..."` — там, где текст переведён/меняется, или элемент один из многих
  (строки таблиц, кнопки фильтров)
- `id="..."` — там, где id уже был нужен по функциональным причинам (см.
  `libs/Login/Login.js`, там `id` читается в `handleChange`), плюс `libs/Button`
  форвардит в DOM только `id`, не `data-testid` — если добавляете testid на
  Button-обёрнутую кнопку, используйте `id`.
- Общий CRUD-движок (`libs/DefList` + `libs/Table/*`) уже размечен — см.
  `helpers/table.js`. Для нового раздела на этом движке отдельная разметка обычно
  не нужна.
