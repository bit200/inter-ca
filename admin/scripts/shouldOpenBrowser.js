'use strict';

// Открывать браузер при старте дев-сервера имеет смысл только тогда, когда
// человек запустил его руками. Под менеджером процессов (pm2) сервер сам
// перезапускается десятки раз за день — падение, EADDRINUSE, деплой правки, —
// и каждый успешный старт открывал новую вкладку с localhost:8001.
function shouldOpenBrowser(env = process.env) {
  if (env.BROWSER === 'none') return false;
  // pm2 в fork-режиме прокидывает эти переменные дочернему процессу.
  if (env.pm_id !== undefined || env.PM2_USAGE || env.PM2_JSON_PROCESSING) {
    return false;
  }
  if (env.CI === 'true') return false;
  return true;
}

module.exports = shouldOpenBrowser;
