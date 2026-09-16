// Связь реального интервью с мок-интервью, собранными по его слабым ответам.
//
// Сборку заводит ментор (PersonalMockInterviewGeneration в itk-platform-en):
// у записи есть sourceInterviewId - это интервью, и weakQuestionIds - снэпшот
// [{index, question}] отобранных блоков оценки ответов. Попытки кандидата
// (MockInterview) о реальном интервью не знают ничего, кроме interviewId
// контейнера, - по нему их и цепляем к сборке. Так получается цепочка
// «вопрос интервью -> персональное мок-интервью -> попытки и их баллы».
//
// Модуль без сети и React: ответы ручек приходят сюда как есть.

import {attemptScoreSummary} from '../../MockInterview/components/evaluateJobState';
import {isAttemptFinished} from '../../MockInterview/components/attemptStatus';
import {questionTitle} from './qaBlocks';

// Три варианта подачи на вкладке «Разбор диалога», выбираются ?mockUi=...
// strip - отдельная полоса под итогом, summary - «было -> стало» в продолжение
// итога, questions - метки на самих вопросах, ушедших в мок-интервью.
export const MOCK_UI_PARAM = 'mockUi';
export const MOCK_UI_VARIANTS = ['strip', 'summary', 'questions'];

export function readMockUiVariant(search) {
    let value = '';
    try {
        value = new URLSearchParams(search || '').get(MOCK_UI_PARAM) || '';
    } catch (e) {
        value = '';
    }
    return MOCK_UI_VARIANTS.includes(value) ? value : MOCK_UI_VARIANTS[0];
}

const FAILED_STATES = ['errored'];

function phaseOf(state) {
    if (state === 'published') return 'ready';
    if (FAILED_STATES.includes(state)) return 'failed';
    return 'building';
}

function time(value) {
    let ms = new Date(value).getTime();
    return isNaN(ms) ? 0 : ms;
}

// Ответ GET /interview/:id/personal-mock-interview - {item, previous[]}.
export function generationRows(payload) {
    if (!payload || typeof payload !== 'object') return [];
    let rows = [payload.item].concat(Array.isArray(payload.previous) ? payload.previous : []);
    return rows.filter(row => row && typeof row === 'object' && !Array.isArray(row) && row.sourceInterviewId != null);
}

function weakList(row) {
    return (Array.isArray(row.weakQuestionIds) ? row.weakQuestionIds : [])
        .filter(entry => entry && Number.isInteger(+entry.index))
        .map(entry => ({index: +entry.index, question: entry.question || ''}));
}

// Что человек может сделать со сборкой прямо сейчас.
// start - попыток ещё нет, заводим первую; open - попытка уже есть, просто
// переходим на последнюю: оттуда видно результаты и можно пройти заново.
function actionOf(phase, lastAttempt) {
    if (phase !== 'ready') return null;
    if (!lastAttempt) return {kind: 'start'};
    return {kind: 'open', attemptId: lastAttempt._id};
}

// generations - записи сборки одного интервью, attempts - все попытки кандидата.
// Свежие сборки первыми; ретраи одной сборки не множатся - ключ interviewId.
export function linkWeakMocks(generations, attempts, sourceInterviewId) {
    let list = Array.isArray(generations) ? generations : [];
    let tries = Array.isArray(attempts) ? attempts.filter(Boolean) : [];
    let seen = new Set();

    return list
        .filter(row => row && (sourceInterviewId == null || +row.sourceInterviewId === +sourceInterviewId))
        .sort((a, b) => time(b.cd) - time(a.cd))
        .filter(row => {
            let key = row.interviewId || row._id;
            if (key == null) return true;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .map(row => {
            let phase = phaseOf(row.state);
            let own = row.interviewId
                ? tries
                    .filter(attempt => attempt.interviewId === row.interviewId && !attempt.is_removed)
                    .sort((a, b) => (+a.attemptNumber || 0) - (+b.attemptNumber || 0) || time(a.cd) - time(b.cd))
                : [];
            let scores = own
                .filter(isAttemptFinished)
                .map(attempt => attemptScoreSummary(attempt).score)
                .filter(score => typeof score === 'number');
            let lastAttempt = own.length ? own[own.length - 1] : null;
            return {
                key: String(row.interviewId || row._id || row.cd),
                interviewId: row.interviewId || null,
                phase,
                cd: row.cd || null,
                weak: weakList(row),
                attempts: own,
                finished: own.filter(isAttemptFinished).length,
                bestScore: scores.length ? Math.max(...scores) : null,
                lastAttempt,
                action: actionOf(phase, lastAttempt),
            };
        });
}

// Вопрос блока оценки -> сборки, в которые он попал. Снэпшот хранит индекс в
// answersEvaluate.blocks (он же number - 1 у блока ленты) и текст вопроса; если
// оценку пересчитали и этот текст дословно стоит у другого блока, берём тот.
export function mocksByBlockNumber(mocks, blocks) {
    let result = new Map();
    let list = Array.isArray(blocks) ? blocks : [];
    let byNumber = new Map(list.map(block => [block.number, block]));
    let norm = text => String(text || '').replace(/\s+/g, ' ').trim().toLowerCase();

    (mocks || []).forEach(mock => mock.weak.forEach(entry => {
        let number = entry.index + 1;
        let block = byNumber.get(number);
        let wanted = norm(entry.question);
        if (wanted && block && norm(questionTitle(block)) !== wanted) {
            let found = list.find(candidate => norm(questionTitle(candidate)) === wanted);
            // Текст из оценки и заголовок из расшифровки могут не совпасть
            // дословно - без точного совпадения доверяем индексу.
            if (found) number = found.number;
        }
        if (number == null || !byNumber.has(number)) return;
        let bucket = result.get(number) || [];
        if (!bucket.includes(mock)) bucket.push(mock);
        result.set(number, bucket);
    }));
    return result;
}

// «Было -> стало»: средний балл слабых вопросов в самом интервью против лучшего
// балла пройденного мок-интервью. Пока попыток нет - after пустой.
export function practiceProgress(mocks, blocks) {
    let byNumber = mocksByBlockNumber(mocks, blocks);
    let before = (blocks || [])
        .filter(block => byNumber.has(block.number) && block.evaluation && block.evaluation.state === 'done')
        .map(block => block.evaluation.score);
    let after = (mocks || []).map(mock => mock.bestScore).filter(score => typeof score === 'number');
    return {
        weakCount: byNumber.size,
        before: before.length ? Math.round(before.reduce((sum, score) => sum + score, 0) / before.length * 10) / 10 : null,
        after: after.length ? Math.max(...after) : null,
    };
}
