import {
    ANSWERS_PIPELINE_STEPS,
    PIPELINE_STEPS,
    answersButtonState,
    answersOutdated,
    normalizeAnswers,
    evaluateButtonState,
    isActiveStatus,
    isTerminalStatus,
    normalizeAnalysis,
    stepState,
} from './dialogAnalysisState';

describe('статус разбора диалога', () => {
    it('шаги идут в порядке очереди и без исхода-ошибки', () => {
        expect(PIPELINE_STEPS).toEqual(['queued', 'downloading', 'analyzing', 'done']);
    });

    it('флаг «роли ждут разметки» доезжает из состояния разбора', () => {
        expect(normalizeAnalysis({status: 'done', rolesPending: true}).rolesPending).toBe(true);
        expect(normalizeAnalysis({status: 'done'}).rolesPending).toBe(false);
    });

    it('незнакомый статус не выдаёт себя за шаг пайплайна', () => {
        expect(normalizeAnalysis({status: 'whatever'}).status).toBe('');
        expect(normalizeAnalysis(null).status).toBe('');
        expect(normalizeAnalysis({status: 'ANALYZING'}).status).toBe('analyzing');
    });

    it('текст ошибки читается и из error.message, и из errorMessage', () => {
        expect(normalizeAnalysis({status: 'error', error: {message: 'Файл недоступен'}}).message)
            .toBe('Файл недоступен');
        expect(normalizeAnalysis({status: 'error', errorMessage: 'Битый файл'}).message).toBe('Битый файл');
    });

    it('активной считается только незавершённая обработка', () => {
        expect(isActiveStatus('queued')).toBe(true);
        expect(isActiveStatus('downloading')).toBe(true);
        expect(isActiveStatus('analyzing')).toBe(true);
        expect(isActiveStatus('done')).toBe(false);
        expect(isActiveStatus('error')).toBe(false);
        expect(isTerminalStatus('done')).toBe(true);
        expect(isTerminalStatus('error')).toBe(true);
    });

    it('дорожка отмечает пройденное, текущее и будущее', () => {
        expect(stepState('queued', 'analyzing')).toBe('done');
        expect(stepState('analyzing', 'analyzing')).toBe('active');
        expect(stepState('done', 'analyzing')).toBe('idle');
        expect(stepState('done', 'done')).toBe('done');
    });
});

describe('кнопка «Оценить»', () => {
    it('скрыта, когда разбор готов', () => {
        expect(evaluateButtonState({status: 'done'}).visible).toBe(false);
    });

    it('видна и активна, пока разбор не запускали', () => {
        let state = evaluateButtonState({}, {hasVideo: true});
        expect(state.visible).toBe(true);
        expect(state.disabled).toBe(false);
        expect(state.busy).toBe(false);
    });

    it('заблокирована со спиннером на каждом шаге обработки', () => {
        ['queued', 'downloading', 'analyzing'].forEach(status => {
            let state = evaluateButtonState({status});
            expect(state.visible).toBe(true);
            expect(state.disabled).toBe(true);
            expect(state.busy).toBe(true);
        });
    });

    it('заблокирована, пока запрос на постановку в очередь ещё летит', () => {
        let state = evaluateButtonState({}, {sending: true});
        expect(state.disabled).toBe(true);
        expect(state.busy).toBe(true);
    });

    it('при ретраебл-ошибке ждёт очередь, а не человека', () => {
        let state = evaluateButtonState({status: 'error', retryable: true, errorMessage: 'mesh 503'});
        expect(state.visible).toBe(true);
        expect(state.disabled).toBe(true);
        expect(state.busy).toBe(true);
        expect(state.reason).toBe('');
    });

    it('при терминальной неретраебл-ошибке возвращается с причиной', () => {
        let state = evaluateButtonState({status: 'error', error: {message: 'Доступ к файлу закрыт'}});
        expect(state.visible).toBe(true);
        expect(state.disabled).toBe(false);
        expect(state.busy).toBe(false);
        expect(state.reason).toBe('Доступ к файлу закрыт');
        expect(state.label).toBe('evaluateAgain');
    });

    it('без видео жать нечего', () => {
        expect(evaluateButtonState({}, {hasVideo: false}).disabled).toBe(true);
    });
});

describe('кнопка «Оценить ответы»', () => {
    it('не видна, пока разбор диалога не готов', () => {
        ['', 'queued', 'analyzing', 'error'].forEach(status => {
            expect(answersButtonState({status}, {}).visible).toBe(false);
        });
    });

    it('видна и активна, когда разбор готов, а оценку не запускали', () => {
        let state = answersButtonState({status: 'done'}, {});
        expect(state.visible).toBe(true);
        expect(state.disabled).toBe(false);
        expect(state.label).toBe('evaluate');
    });

    it('заблокирована со спиннером на каждом шаге своего пайплайна', () => {
        ['queued', 'grouping', 'classifying', 'evaluating'].forEach(status => {
            let state = answersButtonState({status: 'done'}, normalizeAnswers({status}));
            expect(state.visible).toBe(true);
            expect(state.disabled).toBe(true);
            expect(state.busy).toBe(true);
        });
        expect(answersButtonState({status: 'done'}, {}, {sending: true}).disabled).toBe(true);
    });

    it('скрыта, когда оценка готова, и возвращается с причиной после терминальной ошибки', () => {
        expect(answersButtonState({status: 'done'}, {status: 'done'}).visible).toBe(false);
        let failed = answersButtonState({status: 'done'}, {status: 'error', error: {message: 'evaluate недоступен'}});
        expect(failed.disabled).toBe(false);
        expect(failed.reason).toBe('evaluate недоступен');
        expect(failed.label).toBe('evaluateAgain');
        expect(answersButtonState({status: 'done'}, {status: 'error', retryable: true}).disabled).toBe(true);
    });

    it('шаги оценки ответов - свои, дорожка идёт по ним', () => {
        expect(ANSWERS_PIPELINE_STEPS).toEqual(['queued', 'grouping', 'classifying', 'evaluating', 'summarizing', 'done']);
        expect(isActiveStatus('summarizing', ANSWERS_PIPELINE_STEPS)).toBe(true);
        expect(normalizeAnswers({status: 'classifying'}).status).toBe('classifying');
        expect(normalizeAnalysis({status: 'classifying'}).status).toBe('');
        expect(stepState('grouping', 'evaluating', ANSWERS_PIPELINE_STEPS)).toBe('done');
        expect(stepState('evaluating', 'evaluating', ANSWERS_PIPELINE_STEPS)).toBe('active');
    });

    it('блоки рядом со статусом сводятся в result', () => {
        expect(normalizeAnswers({status: 'done', blocks: [{id: 'b1'}]}).result).toEqual({blocks: [{id: 'b1'}]});
        expect(normalizeAnswers({status: 'done', blocks: [], metrics: {speech: {}}, greeting: {greeted: true}, overall: {score: 7}}).result)
            .toEqual({blocks: [], metrics: {speech: {}}, greeting: {greeted: true}, overall: {score: 7}});
    });
});

describe('устаревшая оценка ответов', () => {
    const dialog = analyzedAt => normalizeAnalysis({status: 'done', result: {analyzedAt}});
    const answers = (analyzedAt, status = 'done') => normalizeAnswers({status, result: {analyzedAt, blocks: []}});

    it('оценка по другому разбору записи устарела', () => {
        expect(answersOutdated(dialog('2026-09-16T10:16:48Z'), answers('2026-09-14T11:41:40Z'))).toBe(true);
    });

    it('оценка по тому же разбору, идущая или без метки - не устарела', () => {
        expect(answersOutdated(dialog('2026-09-16T10:16:48Z'), answers('2026-09-16T10:16:48Z'))).toBe(false);
        expect(answersOutdated(dialog('2026-09-16T10:16:48Z'), answers('2026-09-14T11:41:40Z', 'evaluating'))).toBe(false);
        expect(answersOutdated(dialog('2026-09-16T10:16:48Z'), answers(undefined))).toBe(false);
        expect(answersOutdated(normalizeAnalysis({status: 'analyzing'}), answers('2026-09-14T11:41:40Z'))).toBe(false);
    });
});
