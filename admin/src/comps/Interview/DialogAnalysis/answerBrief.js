// Детализация технической оценки ответа из разбора диалога. Сервис оценки
// отдаёт блоку тот же результат, что и ответу на странице разбора
// (/evaluations/:id): балл, показатели evaluation.*, критические ошибки. Поэтому
// показатели и советы считаются теми же функциями, что там, - иначе попап над
// баллом и страница детализации разошлись бы в цифрах.
import {buildGroupPercents, weakestGroup} from '../../EvaluationDetail/components/metricGroups';
import {groupAdvice} from '../../EvaluationDetail/components/adviceLogic';
import {scoreVerdict} from '../../EvaluationDetail/components/scoreVerdict';
import {OVERALL_GROUP} from '../../EvaluationDetail/components/ScoreStrip';

// Короткий вариант для попапа: вердикт словом, проценты по группам показателей,
// критические ошибки и один совет по самому слабому месту.
export function answerBrief(result, schemas, rules) {
    let source = result && typeof result === 'object' ? result : {};
    let score = typeof source.score === 'number' ? source.score : null;
    let max = typeof source.maxScore === 'number' ? source.maxScore : 10;
    let rows = buildGroupPercents(schemas || [], source).filter(row => row.group !== OVERALL_GROUP);
    let errors = source.evaluation && source.evaluation.errors;
    let criticalErrors = errors && errors.is_critical && Array.isArray(errors.errors) ? errors.errors : [];
    let weak = weakestGroup(rows);
    let advice = weak ? (groupAdvice(rules || [], schemas || [], source)[weak.group] || [])[0] : null;
    return {
        score,
        max,
        verdict: scoreVerdict(score, max),
        rows,
        criticalErrors,
        advice: advice ? {label: weak.label, text: advice.advice} : null,
    };
}

// Страница детализации: номер вопроса - по порядку блоков в оценке, как в табе.
export function answerDetailPath(interviewId, number) {
    return `/interviews/${interviewId}/answers/${number}`;
}

// Схемы показателей и правила советов общие на весь кабинет: грузим один раз
// на все попапы, а не на каждый открытый.
let referenceRequest = null;

export function loadEvaluationReference() {
    if (!global.http) return Promise.resolve({schemas: [], rules: []});
    if (!referenceRequest) {
        let items = request => request.then(response => (response && response.items) || []).catch(() => []);
        referenceRequest = Promise.all([
            items(global.http.get('/eval-metric-schemas', {}, {wo_notify: true})),
            items(global.http.get('/eval-advice-rule', {per_page: 200}, {wo_notify: true})),
        ]).then(([schemas, rules]) => {
            // Пустой ответ мог быть сбоем - следующее открытие попробует ещё раз.
            if (!schemas.length) referenceRequest = null;
            return {schemas, rules};
        });
    }
    return referenceRequest;
}

export function resetEvaluationReference() {
    referenceRequest = null;
}
