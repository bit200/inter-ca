// VS Code-задачи (в т.ч. SQL) приходят с бэкенда itk-platform-en (interviews/api):
// в экзамене — exam.templateInfo.vsTasksDb (VsTaskGroup: {_id, name, info_arr: [{lng, task_id}], type: 'vs_task'}),
// сессия поднимается через /pre-start-session -> /exec-start-session (ctrls/vscode.js),
// результат тестов лежит в VsSession.test_info ({status, details: {total, passed, failed}}).
// Здесь только чистая логика — компонент VsTaskRun её рисует.

const SQL_RE = /(^|[^a-z])(sql|postgres(ql)?|mysql|sqlite)([^a-z]|$)/i;

export function isVsTask(item) {
    let type = String(item?.type || '').replace('-', '_');
    return type === 'vs_task' || Array.isArray(item?.info_arr);
}

// Экзамен отдаёт VS-задачи в templateInfo; API экзамена (exam-start-vs-task) может
// вынести их наверх — поддерживаем оба места, чтобы не зависеть от порядка выкатки.
export function getExamVsTasks(exam) {
    let arr = exam?.vsTasksDb || exam?.templateInfo?.vsTasksDb || [];
    return arr.filter(it => it && it._id != null).map(it => ({...it, type: 'vs_task'}));
}

function activeLngs(task) {
    return (task?.info_arr || []).filter(it => it?.task_id && it.status !== 'unactive');
}

// Язык, с которым стартуем сессию: сохранённый в истории, иначе первый активный вариант задачи.
export function pickLng(task, hist) {
    let arr = activeLngs(task);
    let saved = hist?.lng;
    if (saved && arr.some(it => it.lng === saved)) {
        return saved;
    }
    return arr[0]?.lng || '';
}

export function isSqlTask(task, session) {
    let lng = session?.info?.lng;
    let candidates = [
        lng,
        task?.lng,
        task?.type,
        task?.image,
        ...(task?.tags || []),
        ...activeLngs(task).map(it => it.lng),
        ...(activeLngs(task).length ? [] : (task?.info_arr || []).map(it => it?.lng)),
    ];
    if (candidates.some(v => typeof v === 'string' && SQL_RE.test(v))) {
        return true;
    }
    return SQL_RE.test(task?.name || '');
}

// Сводка результата: принимает и VsSession.test_info целиком, и уже урезанный
// pub_test_info ({status, total, passed}) из /get-exam-run-history.
export function pubTestInfo(testInfo) {
    let details = testInfo?.details || testInfo || {};
    let total = +details.total || 0;
    let passed = Math.min(+details.passed || 0, total);
    let failed = +details.failed || Math.max(total - passed, 0);
    if (!total) {
        return {hasResult: false, total: 0, passed: 0, failed: 0, status: 'none'};
    }
    let status = testInfo?.status || (failed > 0 ? 'err' : 'ok');
    return {hasResult: true, total, passed, failed, status};
}

// /session_status docker-m отдаёт {arr: [{cd, status, details}]} (или голый массив) —
// берём последний шаг запуска, чтобы показать человеку, на каком он этапе.
export function lastSessionStep(res) {
    let arr = Array.isArray(res) ? res : (res?.arr || []);
    let last = arr[arr.length - 1];
    return last?.status || '';
}

export function getVscodeLink(startRes) {
    return startRes?.vscode_link
        || startRes?.start_info?.start_data?.vscode_link
        || startRes?.start_info?.vscode_link
        || '';
}

// docker-m на локалке проксирует VS Code по своему порту (http://localhost:3010/vs/<port>/),
// но при пустом LOCAL_MACHINE_SERVER_PORT в ссылке нет порта (http://localhost/vs/<port>/) —
// iframe и «Открыть в другом окне» ведут в никуда. Порт тогда берём у server_http той же сессии.
export function fixVscodeLink(link, serverHttp) {
    try {
        let u = new URL(link);
        let s = new URL(serverHttp);
        let local = h => ['localhost', '127.0.0.1', '0.0.0.0'].includes(h);
        // server_http платформы на локалке — http://0.0.0.0:3010, а в ссылке localhost: хост не совпадает
        let sameHost = u.hostname === s.hostname || (local(u.hostname) && local(s.hostname));
        if (!u.port && s.port && sameHost && u.protocol === s.protocol && /^\/vs\//.test(u.pathname)) {
            u.port = s.port;
            return u.toString();
        }
    } catch (e) {
    }
    return link;
}

export function getStartError(startRes) {
    // docker-m кладёт причину сбоя в start_info.start_data.err (ctrl_start_session возвращает {err})
    let err = startRes?.err_obj || startRes?.err || startRes?.start_info?.err
        || startRes?.start_info?.start_data?.err;
    if (!err) {
        return '';
    }
    return typeof err === 'string' ? err : (err.msg || 'start failed');
}

// Состав проверки знаний (/load-quizes-by-module): квизы лежат в quizes и pubQuizes,
// VS-задачи группы — только в pubQuizes с ключом истории vs_<id группы>.
export function countVsQuizes(pubQuizes) {
    return (pubQuizes || []).filter(it => String(it?.opts?.quiz ?? '').startsWith('vs_')).length;
}

// Процент сдачи проверки знаний: верный квиз, оценённое аудио, решённая VS-задача
// (isCorrect, его ставит Train по test_info.status === 'ok') и js-задача (isCorrect по
// сабмиту, где прошли все тесты) — по одному баллу;
// знаменатель — все задания проверки, а не только квизы.
// VS-задача со сбоем платформы (vsSystemError: VS Code не запустился, vstasks не ответил) и без
// решения не вина ученика — выпадает из знаменателя, балл не снижается.
export function calcQuizPerc(history, total) {
    let corTotal = 0;
    let count = 0;
    let skipped = 0;
    Object.values(history || {}).forEach(item => {
        count++;
        if (item && item.vsSystemError && !item.isCorrect) {
            skipped++;
            return;
        }
        if (item && (item.isCorrect || item.data?.isCorrect)) {
            corTotal++;
        } else if (item && item.hash && (item.rate || item.audioRate)) {
            corTotal++;
        }
    });
    return {quizPerc: Math.round(100 * (corTotal / (Math.max((total || 0) - skipped, 1)))), total: count};
}
