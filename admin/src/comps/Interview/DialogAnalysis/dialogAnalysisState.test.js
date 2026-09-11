import {
    PIPELINE_STEPS,
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
