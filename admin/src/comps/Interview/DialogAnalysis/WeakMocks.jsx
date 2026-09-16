import React, {useEffect, useState} from 'react';
import styles from './dialogAnalysis.module.scss';
import {formatScore, shortQuestionTitle} from './qaBlocks';
import {generationRows, linkWeakMocks, practiceProgress} from './weakMocks';

// Мок-интервью, собранные по слабым ответам этого интервью (см. weakMocks.js).
// Три варианта подачи - полоса, «было -> стало» и метки на вопросах - делят
// один хук загрузки и одни подписи, отличается только место на вкладке.

// Пока сборка идёт, её состояние меняется само - перечитываем редко, это минуты.
const BUILDING_POLL_MS = 20000;

export function useWeakMocks(interviewId) {
    let [mocks, setMocks] = useState([]);
    let [tick, setTick] = useState(0);

    useEffect(() => {
        if (!interviewId || !global.http) return undefined;
        let alive = true;
        let timer = null;
        Promise.resolve(global.http.get(`/interview/${interviewId}/personal-mock-interview`, {}, {wo_notify: true}))
            .then(payload => {
                let rows = generationRows(payload);
                if (!rows.length) return [rows, []];
                return Promise.resolve(global.http.get('/mock-interview/my-list', {}, {wo_notify: true}))
                    .then(list => [rows, (list && list.items) || []], () => [rows, []]);
            })
            .then(([rows, attempts]) => {
                if (!alive) return;
                let next = linkWeakMocks(rows, attempts, interviewId);
                setMocks(next);
                if (next.some(mock => mock.phase === 'building')) {
                    timer = setTimeout(() => setTick(value => value + 1), BUILDING_POLL_MS);
                }
            })
            .catch(() => { alive && setMocks([]); });
        return () => { alive = false; clearTimeout(timer); };
    }, [interviewId, tick]);

    return mocks;
}

// Попытку заводит только «Пройти», когда их ещё нет; уже начатую или пройденную
// открываем по её id, без POST - иначе завелось бы новое интервью.
export function openWeakMock(mock) {
    let go = path => global.navigate ? global.navigate(path) : window.location.assign(path);
    if (!mock || !mock.action) return Promise.resolve();
    if (mock.action.kind === 'open') {
        go(`/mock-interviews/${mock.action.attemptId}`);
        return Promise.resolve();
    }
    return global.http.post('/mock-interview/my-list', {interviewId: mock.interviewId}, {wo_notify: true})
        .then(({item}) => go(`/mock-interviews/${item._id}`))
        .catch(() => global.notify && global.notify.warning('Не удалось открыть мок-интервью. Попробуйте ещё раз.'));
}

const ACTION_LABELS = {start: 'Пройти', open: 'Открыть'};

function plural(count, one, few, many) {
    let mod10 = count % 10;
    let mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
    return many;
}

function formatDay(cd) {
    let date = new Date(cd);
    return isNaN(date.getTime()) ? '' : date.toLocaleDateString('ru-RU', {day: 'numeric', month: 'long'});
}

export function mockStatusText(mock) {
    if (mock.phase === 'building') return 'Собирается';
    if (mock.phase === 'failed') return 'Не собралось';
    if (!mock.attempts.length) return 'Ещё не проходили';
    if (!mock.finished) return 'Начато';
    let times = mock.finished + ' ' + plural(mock.finished, 'раз', 'раза', 'раз');
    return mock.bestScore == null
        ? 'Пройдено ' + times
        : 'Пройдено ' + times + ', лучший балл ' + formatScore(mock.bestScore);
}

function MockAction({mock, className}) {
    let [busy, setBusy] = useState(false);
    if (!mock.action) return null;
    return <button
        type="button"
        className={className || styles.mockAction}
        data-kind={mock.action.kind}
        disabled={busy}
        onClick={() => {
            setBusy(true);
            openWeakMock(mock).finally(() => setBusy(false));
        }}
    >{busy ? 'Открываем…' : ACTION_LABELS[mock.action.kind]}</button>;
}

function mockName(mock) {
    let day = formatDay(mock.cd);
    return 'Мок-интервью' + (day ? ' от ' + day : '');
}

// Вариант 1 - полоса: отдельный блок под итогом, строка на каждую сборку.
export function WeakMocksStrip({mocks}) {
    if (!mocks.length) return null;
    return <section className={styles.mockPanel} data-variant="strip" aria-label="Отработка слабых мест">
        <header className={styles.mockHead}>
            <h3 className={styles.mockTitle}>Отработка слабых мест</h3>
            <p className={styles.mockHint}>Мок-интервью из вопросов, на которые в этом интервью ответ оценён ниже 5.</p>
        </header>
        <ul className={styles.mockList}>
            {mocks.map(mock => <li key={mock.key} className={styles.mockRow} data-phase={mock.phase}>
                <div className={styles.mockRowMain}>
                    <strong className={styles.mockName}>{mockName(mock)}</strong>
                    {mock.weak.length > 0 && <span className={styles.mockTopics} title={mock.weak.map(entry => entry.question).join('\n')}>
                        {mock.weak.length} {plural(mock.weak.length, 'вопрос', 'вопроса', 'вопросов')}: {mock.weak.map(entry => shortQuestionTitle(entry.question, 40)).join('; ')}
                    </span>}
                </div>
                <span className={styles.mockStatus} data-phase={mock.phase}>{mockStatusText(mock)}</span>
                <MockAction mock={mock}/>
            </li>)}
        </ul>
    </section>;
}

// Вариант 2 - «было -> стало»: продолжение итога, главное - сдвинулся ли балл.
export function WeakMocksProgress({mocks, blocks}) {
    if (!mocks.length) return null;
    let progress = practiceProgress(mocks, blocks);
    let lead = mocks.find(mock => mock.action) || mocks[0];
    let grew = progress.before != null && progress.after != null ? progress.after - progress.before : null;
    return <section className={styles.mockPanel} data-variant="summary" aria-label="Отработка слабых мест">
        <header className={styles.mockHead}>
            <h3 className={styles.mockTitle}>Слабые места после интервью</h3>
            <p className={styles.mockHint}>
                {progress.weakCount > 0
                    ? `${progress.weakCount} ${plural(progress.weakCount, 'вопрос', 'вопроса', 'вопросов')} с низким баллом ${progress.weakCount === 1 ? 'ушёл' : 'ушли'} в мок-интервью`
                    : 'По слабым ответам собрано мок-интервью'}
                {mocks.length > 1 ? `, сборок: ${mocks.length}` : ''}.
            </p>
        </header>
        <div className={styles.mockProgress}>
            <div className={styles.mockScore}>
                <span className={styles.mockScoreValue}>{progress.before == null ? '—' : formatScore(progress.before)}</span>
                <span className={styles.mockScoreLabel}>в интервью</span>
            </div>
            <span className={styles.mockArrow} aria-hidden="true"/>
            <div className={styles.mockScore} data-empty={progress.after == null ? 'true' : undefined}
                 data-trend={grew == null ? undefined : grew > 0 ? 'up' : grew < 0 ? 'down' : 'flat'}>
                <span className={styles.mockScoreValue}>{progress.after == null ? '—' : formatScore(progress.after)}</span>
                <span className={styles.mockScoreLabel}>лучшее в мок-интервью</span>
            </div>
            <div className={styles.mockProgressSide}>
                <span className={styles.mockStatus} data-phase={lead.phase}>
                    {progress.after == null && lead.phase === 'ready' && !lead.finished
                        ? 'Пройдите мок-интервью, чтобы увидеть, подтянулись ли эти темы'
                        : mockStatusText(lead)}
                </span>
                <MockAction mock={lead}/>
            </div>
        </div>
    </section>;
}

// Вариант 3 - на вопросах: короткая строка сверху, а сами метки стоят в шапках
// вопросов расшифровки (WeakMockMark).
export function WeakMocksNote({mocks, blocks}) {
    if (!mocks.length) return null;
    let {weakCount} = practiceProgress(mocks, blocks);
    let lead = mocks.find(mock => mock.action) || mocks[0];
    return <section className={styles.mockNote} data-variant="questions" aria-label="Отработка слабых мест">
        <span>
            {weakCount > 0
                ? `${weakCount} ${plural(weakCount, 'вопрос отмечен', 'вопроса отмечены', 'вопросов отмечены')} в расшифровке: по ним собрано мок-интервью.`
                : 'По слабым ответам собрано мок-интервью.'}
            {' '}<span className={styles.mockStatus} data-phase={lead.phase}>{mockStatusText(lead)}</span>
        </span>
        <MockAction mock={lead}/>
    </section>;
}

export function WeakMockMark({mocks}) {
    if (!mocks || !mocks.length) return null;
    let mock = mocks[0];
    let label = mock.phase === 'building' ? 'Мок-интервью собирается'
        : mock.bestScore != null ? 'В мок-интервью: ' + formatScore(mock.bestScore)
            : 'В мок-интервью';
    let title = mockName(mock) + '. ' + mockStatusText(mock);
    if (!mock.action) return <span className={styles.mockMark} data-phase={mock.phase} title={title}>{label}</span>;
    return <button
        type="button"
        className={styles.mockMark}
        data-phase={mock.phase}
        title={title + '. ' + ACTION_LABELS[mock.action.kind]}
        onClick={() => openWeakMock(mock)}
    >{label}</button>;
}
