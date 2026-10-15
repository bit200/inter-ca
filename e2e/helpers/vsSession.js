// VS Code-сессия кандидата (SQL-задача) без печати в iframe редактора.
//
// Почему так. Редактор — openvscode-server в контейнере <session_id>-main, рабочая
// папка /home/itk/itk-livecoding живёт только внутри контейнера (не bind-mount).
// Штатного прогона SQL-тестов с записью VsSession.test_info сейчас нет: кнопка
// «Запуск локальных тестов» в VS Code зовёт `itk test` → /cmd/test.sh, которого в
// SQL-образе нет, а docker-m full_test_new берёт код из S3-патча и команду из
// выключенного /api/vs-test-run. Поэтому тест делает ровно то, что делают
// docker-m (full_test_new) и кандидат в терминале, через API docker-m:
//   1) пишет решение в файл сессии — /api/cmd_run type=exec_session_cmd
//      (docker exec в контейнер сессии, тот же файл, что открыт в VS Code);
//   2) гоняет раннер самой сессии `node /cmd/sql_test.js` и берёт из вывода
//      строку ITK_TEST_RESULT {...};
//   3) сохраняет итог POST /api/save-session-result {session_id, info} — тем же
//      телом, что шлёт docker-m (methods/sessions/full_test_new.js).
const { request } = require('@playwright/test');
const { API_URL, DOCKER_M_URL } = require('./env');

const WORKDIR = '/home/itk/itk-livecoding';
const RESULT_MARKER = 'ITK_TEST_RESULT';

// Как docker-m interpretate_tests_result.parse_tests_result_json: последняя строка
// с маркером; длинный JSON может прийти несколькими кусками stdout.
function parseTestResult(realArr) {
  const lines = Array.isArray(realArr) ? realArr.map(String) : String(realArr || '').split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const ind = lines[i].indexOf(RESULT_MARKER + ' ');
    if (ind === -1) continue;
    let str = lines[i].slice(ind + RESULT_MARKER.length + 1);
    for (let j = i + 1; j <= lines.length; j++) {
      try {
        const v = JSON.parse(str);
        if (v && typeof v === 'object') return v;
      } catch (e) {
        // кусок ещё не целый — приклеиваем следующий
      }
      if (j < lines.length) str += lines[j];
    }
  }
  return null;
}

// Команда для docker exec: содержимое идёт base64, чтобы кавычки, `$` и переводы
// строк в SQL не разбирала оболочка хоста (docker-m запускает exec с shell: true).
function writeFileCmd(rel, content) {
  if (!/^[\w.-]+(\/[\w.-]+)*$/.test(rel) || rel.split('/').includes('..')) {
    throw new Error(`Недопустимый путь файла сессии: ${rel}`);
  }
  const b64 = Buffer.from(String(content), 'utf8').toString('base64');
  return `sh -c "cd ${WORKDIR} && echo ${b64} | base64 -d > ${rel}"`;
}

// Тело info для save-session-result — как в full_test_new: результат раннера,
// статус по коду выхода и вывод для разбора.
function sessionResultInfo(result, { code, realArr } = {}) {
  return { ...result, status: code ? 'error' : 'ok', msg_arr: realArr || [] };
}

async function createDockerM() {
  const ctx = await request.newContext({ baseURL: DOCKER_M_URL });

  async function cmdRun(params, { timeout = 60_000 } = {}) {
    const res = await ctx.get('/api/cmd_run', { params, timeout });
    const text = await res.text();
    if (!res.ok()) {
      throw new Error(`docker-m /api/cmd_run ${params.type}: HTTP ${res.status()} ${text.slice(0, 300)}`);
    }
    const json = JSON.parse(text);
    if (json.err || json.err_obj) {
      throw new Error(`docker-m /api/cmd_run ${params.type}: ${JSON.stringify(json.err || json.err_obj).slice(0, 300)}`);
    }
    return json.v || {};
  }

  const exec = (sessionId, cmd, opts) => cmdRun({ type: 'exec_session_cmd', session_id: sessionId, cmd }, opts);

  return {
    // docker-m недоступен — падаем сразу и говорим, что поднять, а не ждём таймаута
    // старта сессии.
    async assertUp() {
      try {
        const res = await ctx.get('/session_status', { params: { session_id: 'e2e-probe' }, timeout: 5_000 });
        if (res.status() >= 500) throw new Error(`HTTP ${res.status()}`);
      } catch (e) {
        throw new Error(
          `docker-m недоступен на ${DOCKER_M_URL} (${e.message.split('\n')[0]}). VS Code-сессии кандидата ` +
          'поднимает docker-m (/home/igort/work/docker-m, pm2/node start.js) — поднимите его. Другой адрес — E2E_DOCKER_M_URL.'
        );
      }
    },

    exec,

    // Файлы задачи появляются в контейнере после старта (sync_to). Ждём сам файл
    // решения и раннер; не дождались — это не таймаут теста, а понятная причина.
    async waitTaskFiles(sessionId, rel, { timeoutMs = 60_000, intervalMs = 1_000 } = {}) {
      const started = Date.now();
      let last = null;
      while (Date.now() - started < timeoutMs) {
        last = await exec(sessionId, `sh -c "test -f ${WORKDIR}/${rel} && test -f /cmd/sql_test.js && echo files-ready"`);
        if ((last.realArr || []).join('\n').includes('files-ready')) return;
        await new Promise((r) => setTimeout(r, intervalMs));
      }
      throw new Error(
        `В сессии ${sessionId} за ${timeoutMs / 1000} с нет ${rel} или раннера /cmd/sql_test.js. ` +
        'Файлы задачи сессия берёт из архива docker-m _gen_sources/gzip_tasks/task<id>.7z — проверьте, что ' +
        `он собрался (папка должна существовать). Вывод: ${(last && last.realArr || []).join(' ').slice(0, 300)}`
      );
    },

    writeFile: (sessionId, rel, content) => exec(sessionId, writeFileCmd(rel, content)),

    // Раннер SQL самой сессии: свой Postgres сессии (контейнер <session_id>-db).
    async runSqlTests(sessionId, { timeoutMs = 120_000 } = {}) {
      const v = await exec(sessionId, `sh -c "cd ${WORKDIR} && node /cmd/sql_test.js"`, { timeout: timeoutMs });
      const result = parseTestResult(v.realArr);
      if (!result) {
        throw new Error(`Раннер SQL в сессии ${sessionId} не вернул ${RESULT_MARKER}: ${(v.realArr || []).join(' ').slice(0, 500)}`);
      }
      return { result, info: sessionResultInfo(result, v) };
    },

    // Штатная уборка docker-m: контейнеры сессии + compose-проект (сеть и тома SQL).
    kill: (sessionId) => cmdRun({ type: 'kill_user_session', session_id: sessionId }),

    dispose: () => ctx.dispose(),
  };
}

// Сохранение результата тестов в VsSession — тот же вызов, что делает docker-m.
async function saveSessionResult(sessionId, info) {
  const ctx = await request.newContext({ baseURL: API_URL });
  try {
    const res = await ctx.post('/api/save-session-result', { data: { session_id: sessionId, info } });
    if (!res.ok()) {
      throw new Error(`POST /api/save-session-result: HTTP ${res.status()} ${(await res.text()).slice(0, 300)}`);
    }
  } finally {
    await ctx.dispose();
  }
}

module.exports = { createDockerM, saveSessionResult, parseTestResult, writeFileCmd, sessionResultInfo };
