import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import styles from './dialogAnalysis.module.scss';
import {
    ANSWERS_PIPELINE_STEPS,
    PIPELINE_STEPS,
    answersButtonState,
    answersOutdated,
    evaluateButtonState,
    isActiveStatus,
    normalizeAnalysis,
    normalizeAnswers,
    stepState,
} from './dialogAnalysisState';
import {formatScore, questionTitle, readQaBlocks, scoreBand, shortQuestionTitle} from './qaBlocks';
import {formatMs, readBlockTimings, readDialogMetrics, readGreeting, readOverall, combineOverall} from './dialogSummary';
import {
    capabilityLabel,
    capabilityStatusLabel,
    emotionDistribution,
    emotionDominant,
    eventLabel,
    formatDb,
    formatDbfs,
    formatDuration,
    formatPercent,
    formatSeconds,
    hasRecordingSignals,
    markerLabel,
    normalizedRole,
    readConversation,
    roleSummary,
    speakerLabel,
    applySpeakerRoles,
    rolesJustCompleted,
    speakerKey,
    speakerLabels,
} from './dialogAnalysisFormat';
import CallPlayer from '../../TrainMethods/AudioShort/CallPlayer';
import '../../TrainMethods/AudioShort/Player.css';
import {pickDialogMedia, readPlayerPinned, savePlayerPinned, turnIndexAt} from './dialogMedia';
import AnswerBriefPopover, {MarkersPopover, SoftBriefPopover} from './AnswerBriefPopover';
import {answerDetailPath} from './answerBrief';
import {
    BEHAVIOR_FLAG_LABELS,
    LENSES,
    answerScores,
    attachAnswers,
    behaviorCounts,
    behaviorFlags,
    behaviorScore,
    interviewDuration,
    lensDimmed,
    showsBehavior,
    showsTech,
    skipSeriesStarts,
    technicalAverage,
    timelinePosition,
    timelineSegments,
    withoutAnswer,
} from './dialogLens';

// Разбор диалога по записи интервью. Очередь на стороне api ведёт запись по
// шагам queued -> downloading -> analyzing -> done/error, а таб показывает, где
// она сейчас, и отдаёт готовую расшифровку с замечаниями. Разбор по объёму
// сопоставим с видео и считается часами, поэтому статус опрашивается редко и
// только пока работа идёт.
const POLL_MS = 60000;

const STEP_LABELS = {
    queued: 'В очереди',
    downloading: 'Скачиваем запись',
    analyzing: 'Разбираем диалог',
    done: 'Готово',
};

const STATUS_HINTS = {
    queued: 'Запись ждёт свободного слота. Страницу можно закрыть — разбор не прервётся.',
    downloading: 'Забираем видео интервью и достаём из него звук.',
    analyzing: 'Распознаём речь, делим по участникам и ищем замечания. Это занимает часы.',
};

// Оценка ответов - второй процесс на той же карточке: запускается руками поверх
// готового разбора и идёт своими шагами.
const ANSWERS_STEP_LABELS = {
    queued: 'В очереди',
    grouping: 'Делим на вопросы',
    classifying: 'Отмечаем технические',
    evaluating: 'Оцениваем ответы',
    summarizing: 'Пишем итог',
    done: 'Готово',
};

const ANSWERS_HINTS = {
    '': 'Разобьём расшифровку на вопросы и оценим ответы кандидата: технические — баллом, остальные — по теме ли и развёрнуто ли. В конце напишем итог интервью.',
    queued: 'Оценка ждёт свободного слота. Страницу можно закрыть — она не прервётся.',
    grouping: 'Собираем реплики в вопросы: основной вопрос, ответ и уточнения.',
    classifying: 'Отмечаем, какие вопросы технические, а какие про опыт и организацию.',
    evaluating: 'Оцениваем ответы. Готовые оценки появляются в расшифровке по мере проверки.',
    summarizing: 'Собираем оценки ответов и метрики разговора в итог интервью.',
};

function answersOf(interview, analysis) {
    let item = interview && typeof interview === 'object' ? interview : {};
    let dialog = analysisOf(item) || {};
    return item.answersEvaluation || dialog.answersEvaluation || (analysis && analysis.answersEvaluation) || null;
}

function analysisOf(interview) {
    let item = interview && typeof interview === 'object' ? interview : {};
    return item.dialogAnalysis || item.videoAnalysis || null;
}

// speakerRoles - роли, назначенные говорящим руками ({SPEAKER_01: 'client'}),
// onSpeakerRolesChange - сохранить их в интервью. answerLinks - реплики кандидата,
// которые человек сделал ответом на вопрос без ответа, onAnswerLinksChange - сохранить их.
export default function DialogAnalysisTab({item, interview, speakerRoles, onSpeakerRolesChange, answerLinks, onAnswerLinksChange}) {
    let value = interview || item || {};
    let interviewId = value._id;
    // videoUpload - привязанная запись (Interview.videoUpload, id UploadVideo,
    // см. controllers/interviewVideoUpload.js), video - старая текстовая
    // ссылка. Было value.uploadVideo/videoId - поля с такими именами в модели
    // нет, hasVideo был бы false даже при привязанной записи.
    let hasVideo = Boolean(value.video || value.videoUpload);

    let [analysis, setAnalysis] = useState(() => normalizeAnalysis(analysisOf(value)));
    let [sending, setSending] = useState(false);
    let [openTurn, setOpenTurn] = useState(null);
    let [roles, setRoles] = useState(() => ({...(speakerRoles || {})}));
    let [loadedAnswers, setAnswers] = useState(() => normalizeAnswers(answersOf(value)));
    // Оценка, посчитанная по прошлому разбору записи, судит текст до коррекции
    // терминов ASR - её не показываем, а пересчитываем (эффект ниже).
    let answersStale = answersOutdated(analysis, loadedAnswers);
    let answers = useMemo(() => answersStale ? normalizeAnswers(null) : loadedAnswers, [answersStale, loadedAnswers]);
    let staleRerun = useRef(null);
    let [sendingAnswers, setSendingAnswers] = useState(false);
    let mounted = useRef(true);
    let media = pickDialogMedia(value, analysis);

    useEffect(() => () => { mounted.current = false; }, []);

    let applyAnswers = useCallback(payload => {
        if (!mounted.current || !payload) return;
        setAnswers(normalizeAnswers(payload.answersEvaluation || payload));
    }, []);

    let apply = useCallback(payload => {
        if (!mounted.current) return;
        let dialog = payload && payload.dialogAnalysis ? payload.dialogAnalysis : payload;
        setAnalysis(normalizeAnalysis(dialog));
        // Оценка ответов может приехать вложенной в разбор - тогда отдельный запрос не нужен.
        let nested = answersOf(payload, dialog);
        nested && setAnswers(normalizeAnswers(nested));
    }, []);

    let load = useCallback(() => {
        if (!interviewId || !global.http) return;
        // Разбора может ещё не быть - для таба это обычное состояние, а не сбой,
        // поэтому ошибку запроса не показываем всплывашкой.
        global.http.get(`/my-interview/${interviewId}/dialog-analysis`, {}, {wo_notify: true})
            .then(apply)
            .catch(() => {});
    }, [interviewId, apply]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        if (!isActiveStatus(analysis.status)) return undefined;
        let timer = setInterval(load, POLL_MS);
        return () => clearInterval(timer);
    }, [analysis.status, load]);

    let dialogDone = analysis.status === 'done';

    let loadAnswers = useCallback(() => {
        if (!interviewId || !global.http) return;
        // Оценку ответов ещё не запускали - для таба это обычное состояние.
        global.http.get(`/my-interview/${interviewId}/answers-evaluation`, {}, {wo_notify: true})
            .then(applyAnswers)
            .catch(() => {});
    }, [interviewId, applyAnswers]);

    useEffect(() => { dialogDone && loadAnswers(); }, [dialogDone, loadAnswers]);

    useEffect(() => {
        if (!dialogDone || !isActiveStatus(answers.status, ANSWERS_PIPELINE_STEPS)) return undefined;
        let timer = setInterval(loadAnswers, POLL_MS);
        return () => clearInterval(timer);
    }, [dialogDone, answers.status, loadAnswers]);

    let button = evaluateButtonState(analysis, {hasVideo, sending});
    let answersButton = answersButtonState(analysis, answers, {sending: sendingAnswers});

    function evaluateAnswers() {
        if (!interviewId || !global.http || answersButton.disabled) return;
        runAnswersEvaluation();
    }

    function runAnswersEvaluation() {
        setSendingAnswers(true);
        global.http.post(`/my-interview/${interviewId}/answers-evaluation`, {})
            .then(payload => {
                applyAnswers(payload);
                if (mounted.current && !payload) setAnswers(normalizeAnswers({status: 'queued'}));
            })
            .catch(() => {})
            .finally(() => { mounted.current && setSendingAnswers(false); });
    }

    function evaluate() {
        if (!interviewId || !global.http || button.disabled) return;
        setSending(true);
        global.http.post(`/my-interview/${interviewId}/dialog-analysis`, {})
            .then(payload => {
                apply(payload);
                // Пока api не ответил статусом, показываем очередь: работа уже принята.
                if (mounted.current && !payload) setAnalysis(normalizeAnalysis({status: 'queued'}));
            })
            .catch(() => {})
            .finally(() => { mounted.current && setSending(false); });
    }

    // Разбор записи переделан после оценки ответов - пересчитываем её сами, один
    // раз на каждый новый разбор, чтобы упавший запуск не зациклился.
    useEffect(() => {
        let analyzedAt = analysis.result && analysis.result.analyzedAt;
        if (!answersStale || sendingAnswers || staleRerun.current === analyzedAt) return;
        staleRerun.current = analyzedAt;
        runAnswersEvaluation();
    });

    let rawConversation = useMemo(() => readConversation(analysis.result), [analysis.result]);
    let conversation = useMemo(
        () => ({...rawConversation, turns: applySpeakerRoles(rawConversation.turns, roles)}),
        [rawConversation, roles]
    );

    let answersActive = isActiveStatus(answers.status, ANSWERS_PIPELINE_STEPS);

    function assignRole(key, role) {
        let next = {...roles, [key]: role};
        setRoles(next);
        onSpeakerRolesChange && onSpeakerRolesChange(next);
        // Обе роли появились только сейчас - оценка ответов считалась без них,
        // пересчитываем сами, не заставляя искать кнопку «Оценить ответы заново».
        if (dialogDone && !answersActive && !sendingAnswers
            && rolesJustCompleted(rawConversation.turns, roles, next)) {
            runAnswersEvaluation();
        }
    }
    let blocks = useMemo(
        () => readQaBlocks(answers.result, conversation.turns, {
            active: answersActive || sendingAnswers,
            timings: readBlockTimings(answers.result),
        }),
        [answers.result, conversation.turns, answersActive, sendingAnswers]
    );

    let markersById = useMemo(() => {
        let map = new Map();
        conversation.markers.forEach(marker => marker && map.set(marker.id, marker));
        return map;
    }, [conversation.markers]);

    let hint = analysis.status
        ? STATUS_HINTS[analysis.status] || ''
        : hasVideo
            ? 'Разбор ещё не запускали. Кнопка отправит запись в очередь: мы достанем звук, распознаем речь и разделим реплики по участникам.'
            : 'Загрузите запись во вкладке «Обзор» — без видео разбирать нечего.';

    // Итог - то, ради чего открывают карточку, поэтому он над процессами и расшифровкой.
    let overall = dialogDone ? combineOverall(readOverall(answers.result), blocks) : null;
    let greeting = dialogDone ? readGreeting(answers.result) : null;
    let dialogMetrics = dialogDone ? readDialogMetrics(answers.result) : null;

    return <div className={styles.tab}>
        {(overall || greeting || dialogMetrics) && <InterviewSummary
            overall={overall}
            greeting={greeting}
            metrics={dialogMetrics}
            summarizing={answers.status === 'summarizing'}
        />}

        <PipelineCard
            title="Разбор диалога"
            hint={hint}
            button={button}
            actionLabel="Оценить"
            onRun={evaluate}
            steps={PIPELINE_STEPS}
            labels={STEP_LABELS}
            state={analysis}
            stoppedTitle="Разбор остановлен"
        />

        {dialogDone && <PipelineCard
            title="Оценка ответов"
            hint={ANSWERS_HINTS[answers.status] || ''}
            button={answersButton}
            actionLabel="Оценить ответы"
            onRun={evaluateAnswers}
            steps={ANSWERS_PIPELINE_STEPS}
            labels={ANSWERS_STEP_LABELS}
            state={answers}
            stoppedTitle="Оценка ответов остановлена"
        />}

        {dialogDone && <Result
            conversation={conversation}
            blocks={blocks}
            answerLinks={answerLinks}
            onAnswerLinksChange={onAnswerLinksChange}
            answersDone={answers.status === 'done'}
            onAssignRole={assignRole}
            markersById={markersById}
            openTurn={openTurn}
            onOpenTurn={setOpenTurn}
            media={media}
            interviewId={interviewId}
        />}
    </div>;
}

// Шапка процесса: где сейчас запись, и что с ней можно сделать. Одна на оба
// процесса карточки - разбор записи и оценку ответов, - чтобы они читались одинаково.
// Готовый процесс шапку не показывает: результат и так на экране, а дорожка из
// одних зелёных шагов только отодвигает его вниз. Видна она, пока работа не
// запущена, идёт или упала.
function PipelineCard({title, hint, button, actionLabel, onRun, steps, labels, state, stoppedTitle}) {
    if (state.status === 'done') return null;
    return <section className={styles.pipeline}>
        <div className={styles.pipelineHead}>
            <div>
                <h3 className={styles.pipelineTitle}>{title}</h3>
                {hint && <p className={styles.pipelineHint}>{hint}</p>}
            </div>
            {button.visible && <div className={styles.actions}>
                <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={button.disabled}
                    onClick={onRun}
                >
                    {button.busy && <span className={styles.spinner} aria-hidden="true"/>}
                    {button.label === 'evaluateAgain' ? actionLabel + ' заново' : actionLabel}
                </button>
            </div>}
        </div>

        {state.status !== '' && state.status !== 'error' && <ul className={styles.steps}>
            {steps.map(step => <li
                key={step}
                className={styles.step}
                data-state={stepState(step, state.status, steps)}
            >
                <span className={styles.stepDot}/>
                {labels[step]}
            </li>)}
        </ul>}

        {state.status === 'error' && <div className={styles.failure}>
            <span className={styles.failureTitle}>
                {state.retryable ? 'Сбой на нашей стороне — пробуем ещё раз' : stoppedTitle}
            </span>
            <span>{state.message || 'Причину очередь не сообщила.'}</span>
            {state.retryable && <span>Попыток сделано: {state.attempts || 1}. Вмешиваться не нужно.</span>}
        </div>}
    </section>;
}

function Result({conversation, blocks: evaluatedBlocks, answerLinks, onAnswerLinksChange, answersDone, onAssignRole, markersById, openTurn, onOpenTurn, media, interviewId}) {
    let {turns, markers, summary, capabilities} = conversation;
    // Вариант B: линза меняет акценты ленты, шкала показывает, где в интервью
    // какой вопрос, а вопрос без ответа связывается с репликой кандидата руками.
    let [lens, setLens] = useState('all');
    let [links, setLinks] = useState(() => ({...(answerLinks || {})}));
    let [linking, setLinking] = useState(null);
    let [currentMs, setCurrentMs] = useState(0);
    let blocks = useMemo(() => attachAnswers(evaluatedBlocks, links, turns), [evaluatedBlocks, links, turns]);
    let flags = useMemo(() => behaviorFlags(blocks), [blocks]);
    let scores = useMemo(() => answerScores(blocks), [blocks]);
    let seriesStarts = useMemo(() => skipSeriesStarts(blocks), [blocks]);
    let linkingBlock = linking ? blocks.find(block => block.key === linking) : null;

    useEffect(() => {
        if (!linking) return undefined;
        let onKey = event => event.key === 'Escape' && setLinking(null);
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [linking]);

    // Связь сохраняется в интервью рядом с ролями говорящих и применяется к ленте
    // при следующем открытии. Вопрос с новым ответом заново не оценивается.
    function attach(index) {
        let key = linking;
        setLinking(null);
        let next = {...links, [key]: [...(links[key] || []), index]};
        setLinks(next);
        onAnswerLinksChange && onAnswerLinksChange(next);
    }

    // Отрезок шкалы перематывает запись на начало вопроса и прокручивает ленту к нему.
    function jumpTo(segment) {
        media && playFrom({startMs: segment.startMs});
        let target = document.getElementById('dlg-q-' + segment.key);
        target && target.scrollIntoView && target.scrollIntoView({block: 'start', behavior: 'smooth'});
    }
    let labels = speakerLabels(turns);
    let labelOf = turn => labels[speakerKey(turn)] || speakerLabel(turn.role, turn.speaker);
    let player = useRef(null);
    let [playingIndex, setPlayingIndex] = useState(-1);
    let [paused, setPaused] = useState(true);
    let [pinned, setPinned] = useState(() => readPlayerPinned());
    let [rolePicker, setRolePicker] = useState(null);
    let [view, setView] = useState('blocks');
    let byQuestions = view === 'blocks' && blocks.length > 0;

    // Реплика перематывает запись на своё начало и сразу запускает её:
    // человек нажал, чтобы услышать, а не чтобы потом искать кнопку «Play».
    function playFrom(turn) {
        let el = player.current;
        if (!el) return;
        el.currentTime = Math.max(0, Number(turn.startMs || 0)) / 1000;
        let started = el.play && el.play();
        started && started.catch && started.catch(() => {});
    }

    // У звучащей реплики вместо ▶ стоит пауза: второй клик останавливает запись
    // на месте, а не перематывает её снова на начало реплики.
    function pause() {
        let el = player.current;
        el && el.pause && el.pause();
    }

    function onTimeUpdate(event) {
        let ms = event.currentTarget.currentTime * 1000;
        let index = turnIndexAt(turns, ms);
        setPlayingIndex(prev => prev === index ? prev : index);
        // Шкале хватает точности до секунды - чаще перерисовывать незачем.
        let second = Math.floor(ms / 1000) * 1000;
        setCurrentMs(prev => prev === second ? prev : second);
    }

    // Реплика одинакова в ленте и в блоке вопроса: index - место в ленте разбора
    // (-1 у реплики, которую блок принёс текстом), по нему подсвечивается звучащая.
    function renderTurn(turn, index, key, followUp) {
        let turnMarkers = Array.isArray(turn.markerIds)
            ? turn.markerIds.map(id => markersById.get(id)).filter(Boolean)
            : [];
        let isClient = normalizedRole(turn.role) === 'client';
        // По вопросам балл и мягкая оценка уже стоят в шапке вопроса, поэтому у
        // реплики они только в сплошной ленте.
        let inFeed = isClient && index > -1 && !byQuestions;
        let answerScore = inFeed ? scores.get(index) : null;
        if (answerScore && !(answerScore.technical ? showsTech(lens) : showsBehavior(lens))) answerScore = null;
        let flag = inFeed && showsBehavior(lens) ? flags.get(index) : null;
        // В режиме связывания реплика кандидата не раскрывается, а становится ответом.
        let target = Boolean(linkingBlock) && isClient && index > -1
            && !linkingBlock.items.some(item => item.index === index);
        let activate = () => target ? attach(index) : onOpenTurn(openTurn === key ? null : key);
        return <React.Fragment key={key}>
            <div
                className={styles.turn}
                data-role={normalizedRole(turn.role)}
                data-playing={media && index > -1 && playingIndex === index ? 'true' : undefined}
                data-followup={followUp ? 'true' : undefined}
                data-target={target ? 'true' : undefined}
                role="button"
                tabIndex={0}
                onClick={activate}
                onKeyDown={event => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    activate();
                }}
            >
                <span className={styles.turnTime}>{formatDuration(turn.startMs || 0)}</span>
                <span className={styles.turnWho}>
                {turn.speaker && turn.speaker !== 'unknown'
                    ? <button
                        type="button"
                        className={styles.turnSpeaker}
                        aria-haspopup="true"
                        aria-expanded={rolePicker === key}
                        title="Указать, кто это"
                        onClick={event => {
                            event.stopPropagation();
                            setRolePicker(rolePicker === key ? null : key);
                        }}
                        onKeyDown={event => {
                            event.stopPropagation();
                            event.key === 'Escape' && setRolePicker(null);
                        }}
                    >{labelOf(turn)}</button>
                    : <span className={styles.turnSpeaker}>{labelOf(turn)}</span>}
                {followUp && <span className={styles.followUp}>уточнение</span>}
                {answerScore && <span
                    className={styles.answerScore}
                    data-band={scoreBand(answerScore.score, answerScore.max)}
                    title={(answerScore.technical ? 'Балл за ответ на вопрос: ' : 'Балл за нетехнический ответ: ') + formatScore(answerScore.score) + ' из ' + formatScore(answerScore.max)}
                >{formatScore(answerScore.score)}</span>}
                </span>
                {rolePicker === key && <RolePopover
                    role={normalizedRole(turn.role)}
                    onPick={role => {
                        setRolePicker(null);
                        role !== normalizedRole(turn.role) && onAssignRole(speakerKey(turn), role);
                    }}
                    onClose={() => setRolePicker(null)}
                />}
                <p className={styles.turnText}>{turn.text || '—'}</p>
                {media && (index > -1 || typeof turn.startMs === 'number') && (() => {
                    let sounding = !paused && index > -1 && playingIndex === index;
                    let label = sounding ? 'Пауза' : 'Воспроизвести с ' + formatDuration(turn.startMs || 0);
                    return <button
                        type="button"
                        className={styles.turnPlay}
                        aria-label={label}
                        title={label}
                        onClick={event => {
                            // Кнопка живёт внутри реплики: без этого клик ещё и раскроет детали.
                            event.stopPropagation();
                            sounding ? pause() : playFrom(turn);
                        }}
                        onKeyDown={event => event.stopPropagation()}
                    >{sounding ? '❚❚' : '▶'}</button>;
                })()}
                <TurnSignals turn={turn} markers={turnMarkers}/>
                {(flag || target) && <span className={styles.turnFlags}>
                    {flag && <span className={styles.flag} data-kind={flag}>{BEHAVIOR_FLAG_LABELS[flag]}</span>}
                    {target && <span className={styles.attachHint}>Сделать ответом на вопрос {linkingBlock.number}</span>}
                </span>}
            </div>
            {openTurn === key && <TurnDetails turn={turn} label={labelOf(turn)} markers={turnMarkers} onClose={() => onOpenTurn(null)}/>}
        </React.Fragment>;
    }

    if (!turns.length) {
        return <p className={styles.empty}>
            Разбор завершён, но реплик в нём нет. Проверьте, что на записи есть речь обоих участников.
        </p>;
    }

    return <>
        <div className={styles.metrics}>
            <div><span>Реплики</span><strong>{turns.length}</strong></div>
            <div><span>Длительность</span><strong>{formatDuration(summary.durationMs || 0)}</strong></div>
            <div><span>Замечания</span><MarkersMetric markers={markers}/></div>
            <div><span>Участники</span><strong>{roleSummary(turns)}</strong></div>
        </div>

        <EmotionSummary sources={summary.emotionSources}/>

        {blocks.length > 0 && <LensBar
            lens={lens}
            onLens={setLens}
            blocks={blocks}
            answersDone={answersDone}
            turns={turns}
            flags={flags}
            markers={markers}
            durationMs={interviewDuration(summary, turns)}
            currentMs={media ? currentMs : null}
            onJump={jumpTo}
        />}

        <div className={styles.transcriptHead}>
            <h4 className={styles.sectionTitle}>Расшифровка</h4>
            {blocks.length > 0 && <div className={styles.viewSwitch} role="radiogroup" aria-label="Как показать расшифровку">
                {[['blocks', 'По вопросам'], ['turns', 'Все реплики']].map(([key, label]) => <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={view === key}
                    className={styles.viewOption}
                    onClick={() => setView(key)}
                >{label}</button>)}
            </div>}
        </div>
        <div className={styles.transcript} data-media={media ? media.kind : 'none'}>
        {media && <div className={styles.player} data-pinned={pinned ? 'true' : 'false'}>
            {media.kind === 'video'
                ? <video ref={player} src={media.src} controls preload="metadata" onTimeUpdate={onTimeUpdate} onPlay={() => setPaused(false)} onPause={() => setPaused(true)} onEnded={() => setPaused(true)}/>
                : <CallPlayer ref={player} src={media.src} onTimeUpdate={onTimeUpdate} onPlay={() => setPaused(false)} onPause={() => setPaused(true)} onEnded={() => setPaused(true)}/>}
            <div className={styles.playerFoot}>
                <p className={styles.playerHint}>
                    {media.kind === 'video' ? 'Видео интервью' : 'Аудиозапись интервью'}: нажмите ▶ у реплики, чтобы услышать её с начала.
                </p>
                <button
                    type="button"
                    className={styles.playerPin}
                    aria-pressed={pinned}
                    title={pinned ? 'Запись прокрутится вместе с расшифровкой' : 'Запись останется на экране при прокрутке'}
                    onClick={() => setPinned(prev => {
                        savePlayerPinned(!prev);
                        return !prev;
                    })}
                >{pinned ? 'Открепить' : 'Закрепить'}</button>
            </div>
        </div>}
        <div className={styles.feed}>
        {linkingBlock && <div className={styles.linking} role="status">
            <span><strong>Связываем</strong> ответ с вопросом {linkingBlock.number} — нажмите на реплику кандидата</span>
            <button type="button" className={styles.linkingCancel} onClick={() => setLinking(null)}>Отмена · Esc</button>
        </div>}
        {byQuestions
            ? <div className={styles.qaList}>
                {blocks.map(block => <QaBlock
                    key={block.key}
                    block={block}
                    interviewId={interviewId}
                    seriesStart={seriesStarts.has(block.key)}
                    lens={lens}
                    linking={linking === block.key}
                    choosing={linking !== null}
                    onFindAnswer={() => setLinking(linking === block.key ? null : block.key)}
                >
                    {block.items.map((item, position) => renderTurn(
                        item.turn,
                        item.index,
                        item.index > -1 ? (item.turn.id || item.index) : block.key + ':' + position,
                        item.followUp
                    ))}
                </QaBlock>)}
            </div>
            : <div className={styles.turns}>
                {turns.map((turn, index) => renderTurn(turn, index, turn.id || index, false))}
            </div>}
        </div>
        </div>

        {hasRecordingSignals(capabilities) && <div className={styles.signalsGrid}>
            <AcousticEvents capability={capabilities.acousticEvents}/>
            <Capabilities capabilities={capabilities}/>
        </div>}
    </>;
}

// Вопрос интервью целиком: основной вопрос, ответ и уточнения. В шапке - тема
// вопроса и балл за ответ, если вопрос технический; разбор ответа - под репликами.
const KIND_LABELS = {true: 'Технический', false: 'Нетехнический', null: 'Тема не определена'};

function QaBlock({block, interviewId, seriesStart = false, lens = 'all', linking = false, choosing = false, onFindAnswer, children}) {
    let {evaluation} = block;
    let missing = withoutAnswer(block);
    // Скобка цепочки с баллом - у технического вопроса по баллу evaluate, у
    // нетехнического по мягкой оценке: оба вида блоков выглядят одинаково.
    let rated = block.technical === true ? evaluation : block.soft;
    let bracket = Boolean(rated) && rated.state !== 'unanswered' && rated.state !== 'skipped'
        && (block.technical === true ? showsTech(lens) : showsBehavior(lens));
    // Длинный вопрос занимает экран целиком - свёрнутый остаётся одной шапкой.
    // Изначально блоки свёрнуты: расшифровка читается оглавлением вопросов.
    let [collapsed, setCollapsed] = useState(true);
    // Пока ищут ответ, реплики кандидата должны быть видны во всех вопросах, а
    // вопрос, к которому ответ привязали, остаётся раскрытым - видно, что связалось.
    let wasLinking = useRef(linking);
    useEffect(() => {
        if (wasLinking.current && !linking && !missing) setCollapsed(false);
        wasLinking.current = linking;
    }, [linking, missing]);
    let shut = collapsed && !choosing;
    // В шапке - короткая версия вопроса, полный текст - репликой в самом блоке и в подсказке.
    let title = questionTitle(block);
    let shortTitle = shortQuestionTitle(title);
    let bodyId = 'dlg-q-body-' + block.key;
    return <section
        id={'dlg-q-' + block.key}
        className={styles.qaBlock}
        data-technical={String(block.technical)}
        data-dimmed={lensDimmed(lens, block.technical) ? 'true' : undefined}
        aria-label={'Вопрос ' + block.number}
        data-collapsed={shut ? 'true' : undefined}
    >
        <header className={styles.qaHead}>
            <div className={styles.qaTitle}>
                <button
                    type="button"
                    className={styles.qaToggle}
                    aria-expanded={!shut}
                    aria-controls={bodyId}
                    title={shut ? 'Развернуть вопрос' : 'Свернуть вопрос'}
                    onClick={() => setCollapsed(!shut)}
                >
                    <span className={styles.qaChevron} aria-hidden="true"/>
                    <strong className={styles.qaQuestion} title={title}>{shortTitle}</strong>
                </button>
                {block.startMs !== null && <span className={styles.qaTime}>
                    {formatDuration(block.startMs)}–{formatDuration(block.endMs === null ? block.startMs : block.endMs)}
                </span>}
                {block.timing && block.timing.delayMs !== null && <span
                    className={styles.qaTiming}
                    data-early={block.timing.delayMs < 0 ? 'true' : undefined}
                >
                    {block.timing.delayMs < 0
                        ? 'ответ начат до конца вопроса'
                        : 'пауза перед ответом ' + formatMs(block.timing.delayMs)}
                </span>}
                <span className={styles.qaKind} data-technical={String(block.technical)}>
                    {KIND_LABELS[String(block.technical)]}
                </span>
                {showsBehavior(lens) && seriesStart && <span className={styles.flag} data-kind="evasive">Серия пропусков</span>}
            </div>
            <div className={styles.qaActions}>
                {missing && <span className={styles.flag} data-kind="evasive">Ответ не найден</span>}
                {missing && onFindAnswer && <button
                    type="button"
                    className={styles.findAnswer}
                    aria-pressed={linking}
                    onClick={onFindAnswer}
                >{linking ? 'Отменить' : 'Найти ответ'}</button>}
                {block.soft ? <SoftMarks soft={block.soft}/> : <QaScore evaluation={evaluation} number={block.number} interviewId={interviewId}/>}
            </div>
        </header>
        {!shut && <div id={bodyId}>
        <div className={styles.qaTurns} data-bracket={bracket ? (rated.state === 'done' ? 'done' : 'pending') : undefined}>
            {bracket && <span className={styles.bracket} aria-hidden="true">
                {rated.state === 'done' && <b data-band={scoreBand(rated.score, rated.max)}>{formatScore(rated.score)}</b>}
            </span>}
            {children}
        </div>
        {evaluation.state === 'done' && evaluation.feedback && <p className={styles.qaFeedback}>{evaluation.feedback}</p>}
        {block.soft && block.soft.state === 'done' && block.soft.note && <p className={styles.qaFeedback}>{block.soft.note}</p>}
        {block.soft && block.soft.state === 'error' && <p className={styles.qaError}>
            Ответ не оценён: {block.soft.message || 'оценка не сообщила причину.'}
        </p>}
        {evaluation.state === 'error' && <p className={styles.qaError}>
            Ответ не оценён: {evaluation.message || 'сервис оценки не сообщил причину.'}
        </p>}
        </div>}
    </section>;
}

// Число замечаний в сводке - кнопка: по клику попап раскладывает его по видам,
// как балл раскладывается на показатели. Без замечаний раскладывать нечего.
function MarkersMetric({markers}) {
    let [open, setOpen] = useState(false);
    let close = useCallback(() => setOpen(false), []);
    if (!markers.length) return <strong>0</strong>;
    return <div className={styles.scoreAnchor}>
        <button
            type="button"
            className={styles.metricButton}
            aria-label={`Замечания: ${markers.length}, показать по видам`}
            aria-expanded={open}
            aria-haspopup="dialog"
            onClick={() => setOpen(!open)}
        ><strong>{markers.length}</strong></button>
        {open && <MarkersPopover markers={markers} onClose={close}/>}
    </div>;
}

// Балл за ответ: число и шкала из делений - по шкале уровень виден, не читая цифры.
// Балл - кнопка: по клику попап раскладывает его на показатели и ведёт на
// страницу с полной детализацией.
function QaScore({evaluation, number, interviewId}) {
    let [open, setOpen] = useState(false);
    let close = useCallback(() => setOpen(false), []);
    let {state, score, max} = evaluation;
    if (state === 'skipped') return <span className={styles.qaStatus}>Не оцениваем</span>;
    if (state === 'pending') return <span className={styles.qaStatus} data-state="pending">
        <span className={styles.spinner} aria-hidden="true"/>Оцениваем
    </span>;
    if (state === 'missing') return <span className={styles.qaStatus}>Без оценки</span>;
    if (state === 'error') return <span className={styles.qaStatus} data-state="error">Ошибка оценки</span>;

    let band = scoreBand(score, max);
    let cells = Math.max(1, Math.round(max));
    let filled = Math.round(score / max * cells);
    return <div className={styles.scoreAnchor}>
        <button
            type="button"
            className={styles.score}
            data-band={band}
            aria-label={`Оценка ${formatScore(score)} из ${formatScore(max)}, показать детализацию`}
            aria-expanded={open}
            aria-haspopup="dialog"
            onClick={() => setOpen(!open)}
        >
            <span className={styles.scoreValue}>{formatScore(score)}<small>/{formatScore(max)}</small></span>
            <span className={styles.scoreBar} aria-hidden="true">
                {Array.from({length: cells}, (_, cell) => <i key={cell} data-on={cell < filled ? 'true' : undefined}/>)}
            </span>
        </button>
        {open && evaluation.relevance !== undefined && <SoftBriefPopover evaluation={evaluation} onClose={close}/>}
        {open && evaluation.relevance === undefined && <AnswerBriefPopover
            evaluation={evaluation}
            href={interviewId ? answerDetailPath(interviewId, number) : ''}
            onClose={close}
        />}
    </div>;
}

// Панель линз над расшифровкой: переключатель акцента, итоговые баллы за
// технику и поведение, счётчики и шкала времени интервью с вопросами.
function LensBar({lens, onLens, blocks, answersDone, turns, flags, markers, durationMs, currentMs, onJump}) {
    let tech = technicalAverage(blocks);
    let counts = behaviorCounts(blocks);
    let behavior = behaviorScore(blocks);
    let segments = timelineSegments(blocks, durationMs);

    return <section className={styles.lensBar} aria-label="Оценка интервью">
        <div className={styles.lensHead}>
            <div className={styles.viewSwitch} role="radiogroup" aria-label="Линза расшифровки">
                {LENSES.map(option => <button
                    key={option.key}
                    type="button"
                    role="radio"
                    aria-checked={lens === option.key}
                    className={styles.viewOption}
                    onClick={() => onLens(option.key)}
                >{option.label}</button>)}
            </div>
            <div className={styles.lensScores}>
                <div className={styles.lensScore}>
                    <span>Техническая</span>
                    {tech
                        ? <strong data-band={scoreBand(tech.score, tech.max)} title={'Средний балл по оценённым техническим вопросам: ' + tech.count}>{formatScore(tech.score)}<small>/10</small></strong>
                        : <strong data-band="none" title={answersDone ? 'Нет оценённых технических вопросов' : 'Запустите «Оценить ответы»'}>—</strong>}
                </div>
                <div className={styles.lensScore}>
                    <span>Нетехническая</span>
                    {behavior
                        ? <strong data-band={scoreBand(behavior.good, behavior.count)} title="Нетехнических ответов по теме и развёрнуто из оценённых">{behavior.good}<small>/{behavior.count}</small></strong>
                        : <strong data-band="none" title={answersDone ? 'Нет оценённых нетехнических вопросов' : 'Запустите «Оценить ответы»'}>—</strong>}
                </div>
                <div className={styles.lensCounts}>
                    <span className={styles.flag} data-kind="evasive">Без ответа · {counts.unanswered}</span>
                    <span className={styles.flag} data-kind="evasive">Уклончиво · {counts.evasive}</span>
                    <span className={styles.flag} data-kind="off_topic">Не по вопросу · {counts.off_topic}</span>
                    <span className={styles.chip}>Замечания · {markers.length}</span>
                </div>
            </div>
        </div>

        {durationMs > 0 && <div className={styles.timeline}>
            {segments.map(segment => <button
                key={segment.key}
                type="button"
                className={styles.timelineSegment}
                data-technical={String(segment.technical)}
                data-dimmed={lensDimmed(lens, segment.technical) ? 'true' : undefined}
                style={{left: segment.left + '%', width: segment.width + '%'}}
                title={'Вопрос ' + segment.number + ' · ' + formatDuration(segment.startMs)}
                aria-label={'Перейти к вопросу ' + segment.number}
                onClick={() => onJump(segment)}
            />)}
            {showsBehavior(lens) && Array.from(flags).map(([index, kind]) => turns[index] && <span
                key={index}
                className={styles.timelineEvent}
                data-kind={kind}
                style={{left: timelinePosition(Number(turns[index].startMs || 0), durationMs) + '%'}}
                title={BEHAVIOR_FLAG_LABELS[kind] + ' · ' + formatDuration(turns[index].startMs || 0)}
            />)}
            {currentMs !== null && <span
                className={styles.timelineNow}
                style={{left: timelinePosition(currentMs, durationMs) + '%'}}
                aria-hidden="true"
            />}
        </div>}
    </section>;
}

// Мягкая оценка нетехнического ответа - две-три отметки и балл из них той же шкалой,
// что у технического вопроса. Цвет общий: зелёный - по делу, жёлтый - с пробелами, красный - мимо.
const RELEVANCE_LABELS = {on_topic: 'По теме', evasive: 'Уклончиво', off_topic: 'Не по вопросу'};

function SoftMarks({soft}) {
    if (soft.state === 'unanswered') return null;
    if (soft.state === 'skipped') return <span className={styles.qaStatus}>Не оцениваем</span>;
    if (soft.state === 'pending') return <span className={styles.qaStatus} data-state="pending">
        <span className={styles.spinner} aria-hidden="true"/>Оцениваем
    </span>;
    if (soft.state === 'missing') return <span className={styles.qaStatus}>Без оценки</span>;
    if (soft.state === 'error') return <span className={styles.qaStatus} data-state="error">Ошибка оценки</span>;

    let marks = [
        soft.relevance && {key: 'relevance', text: RELEVANCE_LABELS[soft.relevance],
            tone: soft.relevance === 'on_topic' ? 'good' : soft.relevance === 'evasive' ? 'fair' : 'poor'},
        soft.complete !== null && {key: 'complete', text: soft.complete ? 'Развёрнуто' : 'Формально',
            tone: soft.complete ? 'good' : 'fair'},
        soft.engaged === true && {key: 'engaged', text: 'Встречные вопросы', tone: 'good'},
    ].filter(Boolean);

    return <>
        <ul className={styles.softMarks} data-band={soft.band} aria-label="Оценка ответа">
            {marks.map(mark => <li key={mark.key} className={styles.softMark} data-tone={mark.tone}>{mark.text}</li>)}
        </ul>
        <QaScore evaluation={soft}/>
    </>;
}

// Итог интервью: общий балл и сводка, рядом - отметки приветствия и прощания, ниже -
// цифры разговора. Первое, что читают на карточке, поэтому стоит над всем остальным.
function InterviewSummary({overall, greeting, metrics, summarizing}) {
    let band = overall ? scoreBand(overall.score, overall.max) : 'none';
    return <section className={styles.summary} data-band={band} aria-label="Итог интервью">
        <header className={styles.summaryHead}>
            <h3 className={styles.summaryTitle}>Итог интервью</h3>
            {greeting && <ul className={styles.courtesy} aria-label="Приветствие и прощание">
                <CourtesyMark value={greeting.greeted} yes="Приветствие есть" no="Приветствия нет" unknown="Приветствие не определено"/>
                <CourtesyMark value={greeting.farewelled} yes="Прощание есть" no="Прощания нет" unknown="Прощание не определено"/>
            </ul>}
        </header>

        {overall
            ? <div className={styles.summaryBody}>
                {overall.score !== null && <SummaryScore score={overall.score} max={overall.max} basis={overall.basis} parts={overall.parts}/>}
                <div className={styles.summaryText}>
                    {overall.summary && <p>{overall.summary}</p>}
                    {overall.message && !overall.summary && <p className={styles.summaryMuted}>Итог не собран: {overall.message}</p>}
                    {(overall.strengths.length > 0 || overall.weaknesses.length > 0) && <div className={styles.summaryLists}>
                        {overall.strengths.length > 0 && <div>
                            <h4>Сильные стороны</h4>
                            <ul>{overall.strengths.map((text, index) => <li key={index}>{text}</li>)}</ul>
                        </div>}
                        {overall.weaknesses.length > 0 && <div>
                            <h4>Над чем работать</h4>
                            <ul>{overall.weaknesses.map((text, index) => <li key={index}>{text}</li>)}</ul>
                        </div>}
                    </div>}
                </div>
            </div>
            : <p className={styles.summaryMuted}>
                {summarizing && <span className={styles.spinner} aria-hidden="true"/>}
                {summarizing ? 'Пишем итог по оценкам ответов и метрикам разговора.' : 'Итоговой сводки пока нет — она появится после оценки ответов.'}
            </p>}

        {greeting && greeting.note && <p className={styles.courtesyNote}>{greeting.note}</p>}
        {metrics && <DialogMetrics metrics={metrics}/>}
    </section>;
}

function CourtesyMark({value, yes, no, unknown}) {
    let tone = value === true ? 'good' : value === false ? 'poor' : 'none';
    return <li className={styles.courtesyMark} data-tone={tone}>
        <span aria-hidden="true">{value === true ? '✓' : value === false ? '✕' : '?'}</span>
        {value === true ? yes : value === false ? no : unknown}
    </li>;
}

// Общий балл - та же шкала из делений, что у балла вопроса, только крупнее.
function SummaryScore({score, max, basis, parts}) {
    let cells = Math.min(20, Math.max(1, Math.round(max > 20 ? 10 : max)));
    let filled = Math.round(score / max * cells);
    return <div className={styles.summaryScore} role="img" aria-label={`${basis === 'soft' ? 'Оценка по нетехнической части' : 'Общая оценка'} ${formatScore(score)} из ${formatScore(max)}${parts ? `: техническая ${formatScore(parts.technical)}, нетехническая ${formatScore(parts.soft)} с весом ${formatScore(parts.softWeight)}` : ''}`}>
        <span className={styles.summaryScoreValue}>{formatScore(score)}<small>/{formatScore(max)}</small></span>
        <span className={styles.scoreBar} aria-hidden="true">
            {Array.from({length: cells}, (_, cell) => <i key={cell} data-on={cell < filled ? 'true' : undefined}/>)}
        </span>
        {basis === 'soft' && <span className={styles.summaryScoreBasis} aria-hidden="true">по нетехническим ответам</span>}
        {parts && <dl className={styles.summaryScoreParts} aria-hidden="true">
            <div><dt>техника</dt><dd>{formatScore(parts.technical)}</dd></div>
            <div><dt>общение ×{formatScore(parts.softWeight)}</dt><dd>{formatScore(parts.soft)}</dd></div>
        </dl>}
    </div>;
}

// Цифры разговора одной строкой: доля речи - полосой, остальное - числами.
function DialogMetrics({metrics}) {
    let {speech, interruptions, delay, duration} = metrics;
    let pick = stats => stats && (stats.median !== null ? stats.median : stats.mean);
    return <dl className={styles.dialogMetrics}>
        {speech && <div className={styles.dialogMetric} data-wide="true">
            <dt>Кто сколько говорил</dt>
            <dd>
                <span className={styles.speechBar} aria-hidden="true">
                    <i data-role="client" style={{width: Math.max(0, Math.min(100, speech.clientPercent)) + '%'}}/>
                    <i data-role="manager" style={{width: Math.max(0, Math.min(100, speech.managerPercent)) + '%'}}/>
                </span>
                <span className={styles.speechLegend}>
                    <span data-role="client">Кандидат {Math.round(speech.clientPercent)}%</span>
                    <span data-role="manager">Интервьюер {Math.round(speech.managerPercent)}%</span>
                </span>
            </dd>
        </div>}
        {interruptions && <div className={styles.dialogMetric}>
            <dt>Перебивания</dt>
            <dd>
                <span className={styles.metricLine}>кандидат перебил <strong>{interruptions.byClient}</strong></span>
                <span className={styles.metricLine}>интервьюер перебил <strong>{interruptions.byManager}</strong></span>
            </dd>
        </div>}
        {(delay || duration) && <div className={styles.dialogMetric}>
            <dt>{(delay || duration).median !== null ? 'Ответы, медиана' : 'Ответы, в среднем'}</dt>
            <dd>
                {delay && <span className={styles.metricLine}>пауза перед ответом <strong>{formatMs(pick(delay))}</strong></span>}
                {duration && <span className={styles.metricLine}>длина ответа <strong>{formatMs(pick(duration))}</strong></span>}
            </dd>
        </div>}
    </dl>;
}

// Кто говорит в реплике. Разбор угадывает роли по дорожкам и ошибается, когда
// интервьюеров несколько, поэтому роль голоса можно поправить прямо в ленте:
// попап над репликой, выбор применяется ко всем репликам этого голоса.
const ROLE_OPTIONS = [
    {role: 'client', label: 'Кандидат'},
    {role: 'manager', label: 'Интервьюер'},
];

function RolePopover({role, onPick, onClose}) {
    let box = useRef(null);

    useEffect(() => {
        // Клик мимо закрывает попап. Подпись, которая его открыла, закроет его сама,
        // иначе закрытие здесь и переключение по клику открыли бы его снова.
        function onDown(event) {
            let target = event.target;
            if (box.current && box.current.contains(target)) return;
            if (target.closest && target.closest('[aria-expanded="true"]')) return;
            onClose();
        }
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [onClose]);

    return <div
        ref={box}
        className={styles.rolePopover}
        onClick={event => event.stopPropagation()}
        onKeyDown={event => {
            // Реплика сама ловит Enter и пробел - выбор роли не должен её раскрывать.
            event.stopPropagation();
            event.key === 'Escape' && onClose();
        }}
    >
        <span className={styles.rolePopoverTitle}>Кто говорит?</span>
        <div className={styles.roleSwitch} role="radiogroup" aria-label="Роль говорящего">
            {ROLE_OPTIONS.map(option => <button
                key={option.role}
                type="button"
                role="radio"
                aria-checked={role === option.role}
                className={styles.roleOption}
                data-role={option.role}
                onClick={() => onPick(option.role)}
            >{option.label}</button>)}
        </div>
    </div>;
}

// Короткие подписи прямо в ленте: по ним видно проблемную реплику, не открывая её.
function TurnSignals({turn, markers}) {
    let signals = turn.signals && typeof turn.signals === 'object' ? turn.signals : {};
    let emotion = signals.emotionSummary || signals.emotionModel || signals.emotion;
    let events = Array.isArray(signals.events) ? signals.events.slice(0, 2) : [];
    let chips = [];

    markers.forEach(marker => chips.push({
        key: 'm' + (marker.id || chips.length),
        kind: 'marker',
        text: markerLabel(marker.category) + (marker.matchedPhrase ? ': ' + marker.matchedPhrase : ''),
    }));

    if (emotion && emotion.dominant) {
        chips.push({key: 'emotion', kind: 'emotion', text: 'Эмоция: ' + emotionDominant(emotion)});
    }

    events.forEach((event, index) => chips.push({
        key: 'e' + index,
        kind: 'noise',
        text: 'Шум: ' + eventLabel(event.type, event.label),
    }));

    if (!chips.length) return null;

    return <span className={styles.turnSignals}>
        {chips.map(chip => <span key={chip.key} className={styles.signal} data-kind={chip.kind}>{chip.text}</span>)}
    </span>;
}

function TurnDetails({turn, label, markers, onClose}) {
    let signals = turn.signals && typeof turn.signals === 'object' ? turn.signals : {};
    let prosody = signals.prosody && typeof signals.prosody === 'object' ? signals.prosody : null;
    let events = Array.isArray(signals.events) ? signals.events : [];
    let startMs = Number(turn.startMs || 0);
    let endMs = Math.max(startMs, Number(turn.endMs || startMs));

    return <div className={styles.details}>
        <div className={styles.detailsHead}>
            <strong>{label || speakerLabel(turn.role, turn.speaker)} · {formatDuration(startMs)}–{formatDuration(endMs)}</strong>
            <button type="button" className={styles.detailsClose} onClick={onClose} aria-label="Свернуть реплику">×</button>
        </div>
        <blockquote className={styles.detailsQuote}>{turn.text || 'Текст реплики не распознан.'}</blockquote>

        {markers.map((marker, index) => <div key={'m' + index} className={styles.signalRow}>
            <span>{markerLabel(marker.category)}</span>
            <span>{marker.matchedPhrase || marker.text || 'Обнаружено'}</span>
        </div>)}

        {signals.emotionModel && <div className={styles.signalRow}>
            <span>Эмоция по модели</span>
            <span>{emotionDominant(signals.emotionModel)} · {emotionDistribution(signals.emotionModel)}</span>
        </div>}
        {signals.emotionProsody && <div className={styles.signalRow}>
            <span>Эмоция по голосу</span>
            <span>{emotionDominant(signals.emotionProsody)} · {emotionDistribution(signals.emotionProsody)}</span>
        </div>}

        {prosody && typeof prosody.wordsPerMinute === 'number' && <div className={styles.signalRow}>
            <span>Темп</span><span>{Math.round(prosody.wordsPerMinute)} слов/мин</span>
        </div>}
        {prosody && typeof prosody.monotonicity === 'number' && <div className={styles.signalRow}>
            <span>Монотонность</span><span>{formatPercent(prosody.monotonicity)}</span>
        </div>}
        {prosody && typeof prosody.rmsDbfs === 'number' && <div className={styles.signalRow}>
            <span>Средняя громкость</span><span>{formatDbfs(prosody.rmsDbfs)}</span>
        </div>}

        {events.map((event, index) => <div key={'e' + index} className={styles.signalRow}>
            <span>{eventLabel(event.type, event.label)}</span>
            <span>{formatDuration(event.startMs || 0)}–{formatDuration(event.endMs || 0)}</span>
        </div>)}
    </div>;
}

function EmotionSummary({sources}) {
    let value = sources && typeof sources === 'object' ? sources : {};
    let items = [
        {key: 'consensus', title: 'Проверенный вывод', summary: value.consensus},
        {key: 'model', title: 'Гипотеза модели', summary: value.model},
        {key: 'acoustic', title: 'По голосу', summary: value.acoustic},
    ].filter(row => row.summary && typeof row.summary === 'object');

    if (!items.length) return null;

    return <>
        <h4 className={styles.sectionTitle}>Эмоции за интервью</h4>
        <div className={styles.signalCard}>
            {items.map(row => <div key={row.key} className={styles.signalRow}>
                <span>{row.title}</span>
                <span>{emotionDominant(row.summary)} · {emotionDistribution(row.summary)}</span>
            </div>)}
        </div>
    </>;
}

function AcousticEvents({capability}) {
    let events = capability && Array.isArray(capability.events) ? capability.events : [];
    return <section className={styles.signalCard}>
        <h4>Акустические события</h4>
        {!events.length && <p className={styles.empty}>Фоновых событий выше порога не найдено.</p>}
        {events.slice(0, 12).map((event, index) => <div key={index} className={styles.signalRow}>
            <span>{eventLabel(event.type, event.label)}</span>
            <span>
                {formatSeconds(event.startSec)}–{formatSeconds(event.endSec)}
                {typeof event.confidence === 'number' ? ' · ' + formatPercent(event.confidence) : ''}
            </span>
        </div>)}
    </section>;
}

function Capabilities({capabilities}) {
    let rows = Object.keys(capabilities || {})
        .filter(key => key !== 'acousticEvents')
        .filter(key => capabilities[key] && typeof capabilities[key] === 'object' && capabilities[key].status)
        .map(key => ({key, status: capabilities[key].status}));
    let quality = capabilities && capabilities.technicalQuality ? capabilities.technicalQuality : {};
    let snr = quality.snr && typeof quality.snr === 'object' ? quality.snr : {};

    return <section className={styles.signalCard}>
        <h4>Качество записи</h4>
        {!rows.length && <p className={styles.empty}>Дополнительные сигналы не запрашивались.</p>}
        {rows.map(row => <div key={row.key} className={styles.signalRow}>
            <span>{capabilityLabel(row.key)}</span>
            <span>{capabilityStatusLabel(row.status)}</span>
        </div>)}
        {typeof snr.estimatedDb === 'number' && <div className={styles.signalRow}>
            <span>Сигнал/шум</span><span>{formatDb(snr.estimatedDb)}</span>
        </div>}
    </section>;
}
