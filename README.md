# VELORA

Концептуальный сайт студии дизайна интерьеров с адаптивной вёрсткой и интерактивной галереей. HTML, CSS и JavaScript работают без сборки. Изображения и шрифты входят в репозиторий.

## Локальный запуск

В корне репозитория запустите сервер и откройте [сайт](http://127.0.0.1:4174/).

```sh
python3 -m http.server 4174 --bind 127.0.0.1
```

Форма демонстрирует проверку полей в браузере. Введённые данные не отправляются и не сохраняются.

## Проверки

Базовые проверки запускаются через Node.js.

```sh
node --check app.js
node --test tests/behavior.test.mjs
```

Для браузерных проверок с работающим локальным сервером установите Playwright и Chromium.

```sh
npm install --no-save --no-package-lock @playwright/test
npx playwright install chromium
npx playwright test -c tests/playwright.config.mjs
```

Сведения о шрифтах приведены в [assets/fonts/LICENSE.txt](assets/fonts/LICENSE.txt).
