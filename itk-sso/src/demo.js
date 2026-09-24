'use strict';

const path = require('path');
const express = require('express');
const { esc } = require('./views');

/**
 * Демо-«внешняя система»: страница с кнопкой «Войти через ITK», которая честно
 * проходит Authorization Code + PKCE против этого же сервиса — чтобы локально
 * прогнать весь сценарий, не поднимая чужое приложение.
 *
 * Секрета у страницы нет и быть не может: демо-клиент публичный, код меняется на
 * токены прямо из браузера с code_verifier. В проде роутер не монтируется (см. config.demo).
 */

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

/**
 * Применённое окружение прямо на странице: правку в .env видно без захода на сервер.
 * Показываем не сырые строки, а то, с чем сервис поднялся, и отдельной колонкой —
 * пришло значение из окружения или осталось дефолтом (ради этого блок и заводился).
 */
function renderEnv(groups) {
    if (!groups || !groups.length) return '';

    const rows = (vars) => vars.map((v) => `
      <div class="env__var${v.fromEnv ? ' is-set' : ''}">
        <dt>${esc(v.name)}</dt>
        <dd class="env__value${v.secret ? ' is-hidden' : ''}">${esc(v.value)}</dd>
        <dd class="env__origin">${v.fromEnv ? 'из окружения' : 'по умолчанию'}</dd>
      </div>`).join('');

    const blocks = groups.map((g) => `
    <div class="env__group">
      <h3>${esc(g.title)}</h3>
      ${g.note ? `<p class="note">${esc(g.note)}</p>` : ''}
      <dl>${rows(g.vars)}</dl>
    </div>`).join('');

    return `
  <section class="row" id="envRow">
    <h2>окружение</h2>
    <div>
      <p class="note env__lede">С чем поднялся сервис. Значений секретов здесь нет — у них видно только, заданы они или нет.</p>
      <div class="env">${blocks}
      </div>
    </div>
  </section>`;
}

function renderPage(demo) {
    const settings = JSON.stringify({
        clientId: demo.clientId,
        clientName: demo.clientName,
        redirectUri: demo.redirectUri,
        scope: demo.scope,
    });

    return `<!doctype html>
<html lang="ru"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<link rel="icon" href="data:,">
<title>Демо-вход через ITK</title>
<link rel="stylesheet" href="/demo/demo.css">
</head><body>
<header class="head">
  <div>
    <p class="mark">ITK</p>
    <h1>Внешняя система</h1>
    <p class="lede">Страница притворяется чужим приложением: жмёте кнопку — и проходите тот же
      Authorization Code + PKCE, что и настоящий клиент <b>${esc(demo.clientId)}</b>.</p>
  </div>
  <div class="clock" id="clock" hidden>
    <span class="clock__value" id="clockValue">--:--</span>
    <span class="clock__label">до конца access token</span>
  </div>
</header>

<div class="bar">
  <button type="button" id="login">Войти через ITK</button>
  <button type="button" id="refresh" class="ghost" disabled>Обновить токен</button>
  <button type="button" id="logout" class="ghost" disabled>Выйти</button>
  <span class="state" id="state">Вход не выполнен</span>
</div>

<main>
  <section class="row" id="flowRow">
    <h2>Ход обмена</h2>
    <div><ol class="flow" id="flow"><li class="muted">Пока ничего не происходило — начните с кнопки «Войти через ITK».</li></ol></div>
  </section>

  <section class="row" id="idRow" hidden>
    <h2>id_token</h2>
    <div><pre id="idToken"></pre></div>
  </section>

  <section class="row" id="accessRow" hidden>
    <h2>access_token</h2>
    <div><pre id="accessToken"></pre></div>
  </section>

  <section class="row" id="userinfoRow" hidden>
    <h2>Профиль</h2>
    <div><pre id="userinfo"></pre><p class="note" id="userinfoNote" hidden></p></div>
  </section>

  <section class="row" id="refreshRow" hidden>
    <h2>refresh_token</h2>
    <div><pre id="refreshToken"></pre><p class="note">«Выйти» отзывает именно его: access token после этого догорает сам (см. #1947).</p></div>
  </section>
${renderEnv(demo.envReport)}
</main>

<script>window.DEMO = ${settings};</script>
<script src="/demo/demo.js"></script>
</body></html>`;
}

function createDemoRouter({ config }) {
    // Страница показывает и своё окружение: конфигурация уже посчитала его без секретов.
    const demo = { ...config.demo, envReport: config.envReport };
    const router = express.Router();

    const sendPage = (req, res) => {
        res.set('cache-control', 'no-store');
        res.type('html').send(renderPage(demo));
    };

    router.get('/demo', sendPage);
    // Возврат от провайдера: код разбирает та же страница, отдельного экрана нет.
    router.get('/demo/callback', sendPage);

    router.get('/demo/demo.css', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'demo.css')));
    router.get('/demo/demo.js', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'demo-client.js')));

    return router;
}

module.exports = { createDemoRouter, renderPage };
