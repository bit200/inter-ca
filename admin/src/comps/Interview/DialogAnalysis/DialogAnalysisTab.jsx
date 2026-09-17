import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import styles from './dialogAnalysis.module.scss';
import {
    ANSWERS_PIPELINE_STEPS,
    PIPELINE_STEPS,
    answersButtonState,
    answersOutdated,
    dialogTabLoading,
    evaluateButtonState,
    isActiveStatus,
    normalizeAnalysis,
    normalizeAnswers,
    stepState,
} from './dialogAnalysisState';
import {formatScore, isScoredBlock, questionTitle, readQaBlocks, scoreBand, questionRemarks, shortQuestionTitle} from './qaBlocks';
import {mocksByBlockNumber, readMockUiVariant} from './weakMocks';
import {WeakMockMark, WeakMocksNote, WeakMocksProgress, WeakMocksStrip, useWeakMocks} from './WeakMocks';
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
    candidateMarkers,
    rolesJustCompleted,
    speakerKey,
    speakerLabels,
    listSpeakers,
    turnTimeRange,
    turnsCountLabel,
    isUnrecognizedTurn,
    UNRECOGNIZED_TURN_HINT,
    UNRECOGNIZED_TURN_TEXT,
} from './dialogAnalysisFormat';
import RolesPendingNotice from './RolesPendingNotice';
import {shouldSendRoles} from './speakerRolesDraft';
import CallPlayer from '../../TrainMethods/AudioShort/CallPlayer';
import '../../TrainMethods/AudioShort/Player.css';
import {pickDialogMedia, playerView, readPlayerAudioOnly, readPlayerPinned, savePlayerAudioOnly, savePlayerPinned, turnIndexAt} from './dialogMedia';
import AnswerBriefPopover, {MarkersPopover, SoftBriefPopover} from './AnswerBriefPopover';
import InterviewAnswerModal from '../InterviewAnswer/InterviewAnswerModal';
import {
    BEHAVIOR_FLAG_LABELS,
    PART_LABELS,
    answerScores,
    attachAnswers,
    behaviorFlags,
    interviewDuration,
    lensDimmed,
    partSegments,
    segmentMuted,
    showsBehavior,
    skipSeriesStarts,
    turnParts,
    timelinePosition,
    conversationTracks,
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
    rolesPending: 'Оценка начнётся сама, как только вы отметите роли участников.',
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
    let [sendingRoles, setSendingRoles] = useState(false);
    // Разбор и оценка, пришедшие вместе с интервью, уже есть на руках - ждать нечего.
    let [analysisLoaded, setAnalysisLoaded] = useState(() => Boolean(analysisOf(value)));
    let [answersLoaded, setAnswersLoaded] = useState(() => Boolean(answersOf(value)));
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
            .catch(() => {})
            .finally(() => { mounted.current && setAnalysisLoaded(true); });
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
            .catch(() => {})
            .finally(() => { mounted.current && setAnswersLoaded(true); });
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

    // Роли уходят на бэк: он кладёт их в разбор (их читает оценка ответов) и,
    // если теперь есть и интервьюер, и кандидат, сам продолжает оценку, а за
    // ней - сборку мок-интервью по слабым ответам.
    function sendRoles(next) {
        if (!interviewId || !global.http) return;
        setSendingRoles(true);
        global.http.post(`/my-interview/${interviewId}/speaker-roles`, {roles: next})
            .then(payload => {
                apply(payload);
                payload && payload.answersStarted && mounted.current && setAnswers(normalizeAnswers({status: 'queued'}));
            })
            .catch(() => {})
            .finally(() => { mounted.current && setSendingRoles(false); });
    }

    function assignRoles(patch) {
        let next = {...roles, ...patch};
        setRoles(next);
        onSpeakerRolesChange && onSpeakerRolesChange(next);
        let justCompleted = rolesJustCompleted(rawConversation.turns, roles, next);
        if (dialogDone && !answersActive && !sendingRoles
            && shouldSendRoles({rolesPending: analysis.rolesPending, justCompleted})) {
            sendRoles(next);
        }
    }

    function assignRole(key, role) {
        assignRoles({[key]: role});
    }
    let blocks = useMemo(
        () => readQaBlocks(answers.result, conversation.turns, {
            active: answersActive || sendingAnswers,
            timings: readBlockTimings(answers.result),
            markers: conversation.markers,
        }),
        [answers.result, conversation.turns, conversation.markers, answersActive, sendingAnswers]
    );

    let weakMocks = useWeakMocks(interviewId);

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
    // Мок-интервью по слабым ответам - сразу под итогом: это продолжение его
    // «слабых сторон». Вариант подачи - ?mockUi=strip|summary|questions.
    let mockUi = readMockUiVariant(typeof window === 'undefined' ? '' : window.location.search);
    let mockMarks = useMemo(
        () => mockUi === 'questions' ? mocksByBlockNumber(weakMocks, blocks) : null,
        [mockUi, weakMocks, blocks]
    );
    let dialogMetrics = dialogDone ? readDialogMetrics(answers.result) : null;

    if (interviewId && global.http && dialogTabLoading({analysisLoaded, answersLoaded, dialogDone})) {
        return <DialogTabSkeleton/>;
    }

    return <div className={styles.tab}>
        {(overall || greeting || dialogMetrics) && <InterviewSummary
            overall={overall}
            greeting={greeting}
            metrics={dialogMetrics}
            summarizing={answers.status === 'summarizing'}
        />}

        {mockUi === 'strip' && <WeakMocksStrip mocks={weakMocks}/>}
        {mockUi === 'summary' && <WeakMocksProgress mocks={weakMocks} blocks={blocks}/>}
        {mockUi === 'questions' && <WeakMocksNote mocks={weakMocks} blocks={blocks}/>}

        {dialogDone && analysis.rolesPending && <RolesPendingNotice
            speakers={listSpeakers(rawConversation.turns).filter(entry => entry.sample)}
            savedRoles={roles}
            sending={sendingRoles}
            onSubmit={assignRoles}
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
            hint={!answers.status && analysis.rolesPending ? ANSWERS_HINTS.rolesPending : ANSWERS_HINTS[answers.status] || ''}
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
            mockMarks={mockMarks}
        />}
    </div>;
}

// Скелетон повторяет раскладку готового разбора - итог и свёрнутые блоки
// вопросов тех же размеров, - чтобы после загрузки контент встал на место
// заглушек, а не сдвинул страницу.
function DialogTabSkeleton() {
    return <div className={styles.tab} aria-busy="true" aria-label="Загружаем разбор диалога" data-testid="dialog-skeleton">
        <div className={`${styles.summary} ${styles.skeletonSummary}`} aria-hidden="true">
            <span className={styles.skeletonLine} style={{width: 150, height: 18}}/>
            <div className={styles.summaryBody}>
                <span className={styles.skeletonScore}/>
                <div className={styles.skeletonText}>
                    <span className={styles.skeletonLine}/>
                    <span className={styles.skeletonLine}/>
                    <span className={styles.skeletonLine} style={{width: '62%'}}/>
                </div>
            </div>
        </div>
        <div className={styles.skeletonBlocks} aria-hidden="true">
            {[72, 58, 80, 46].map((width, index) => <div key={index} className={styles.skeletonBlock}>
                <span className={styles.skeletonLine} style={{width: `${width}%`}}/>
                <span className={styles.skeletonLine} style={{width: 44}}/>
            </div>)}
        </div>
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

function Result({conversation, blocks: evaluatedBlocks, answerLinks, onAnswerLinksChange, answersDone, onAssignRole, markersById, openTurn, onOpenTurn, media, interviewId, mockMarks}) {
    let {turns, summary, capabilities} = conversation;
    let markers = useMemo(() => candidateMarkers(conversation.turns, conversation.markers), [conversation.turns, conversation.markers]);
    // Вопрос без ответа связывается с репликой кандидата руками.
    let [links, setLinks] = useState(() => ({...(answerLinks || {})}));
    let [linking, setLinking] = useState(null);
    let [currentMs, setCurrentMs] = useState(0);
    let blocks = useMemo(() => attachAnswers(evaluatedBlocks, links, turns), [evaluatedBlocks, links, turns]);
    let flags = useMemo(() => behaviorFlags(blocks), [blocks]);
    let scores = useMemo(() => answerScores(blocks), [blocks]);
    let seriesStarts = useMemo(() => skipSeriesStarts(blocks), [blocks]);
    let scoredBlocks = useMemo(() => blocks.filter(isScoredBlock), [blocks]);
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

    let labels = speakerLabels(turns);
    let labelOf = turn => labels[speakerKey(turn)] || speakerLabel(turn.role, turn.speaker);
    let player = useRef(null);
    let [playingIndex, setPlayingIndex] = useState(-1);
    let [paused, setPaused] = useState(true);
    let [pinned, setPinned] = useState(() => readPlayerPinned());
    let [audioOnly, setAudioOnly] = useState(() => readPlayerAudioOnly());
    let view = playerView(media, audioOnly);
    // При смене видео на аудио плеер пересоздаётся: место и воспроизведение
    // переносим в новый, чтобы запись продолжилась с той же секунды.
    let resume = useRef(null);

    function toggleAudioOnly() {
        let el = player.current;
        resume.current = el ? {time: el.currentTime || 0, playing: !el.paused} : null;
        setAudioOnly(prev => {
            savePlayerAudioOnly(!prev);
            return !prev;
        });
    }

    useEffect(() => {
        let state = resume.current;
        let el = player.current;
        resume.current = null;
        if (!state || !el) return;
        el.currentTime = state.time;
        if (state.playing) {
            let started = el.play && el.play();
            started && started.catch && started.catch(() => {});
        }
    }, [view]);
    let [rolePicker, setRolePicker] = useState(null);
    // Разделы как в карточке звонка: «Обзор» - вопросы с результатами, «Диалог» -
    // ход разговора и вся лента. Без вопросов открывать пустой обзор незачем.
    let [section, setSection] = useState(() => scoredBlocks.length > 0 ? 'overview' : 'dialog');
    let byQuestions = section === 'overview' && scoredBlocks.length > 0;
    // «К диалогу» у вопроса: переключаемся на ленту, докручиваем до его первой
    // реплики и на пару секунд подсвечиваем все реплики вопроса.
    let [focus, setFocus] = useState(null);
    function openInDialog(block) {
        let indexes = block.items.map(item => item.index).filter(index => index > -1);
        setSection('dialog');
        setFocus(indexes.length ? {key: block.key, indexes} : null);
    }
    useEffect(() => {
        if (!focus || section !== 'dialog') return undefined;
        let target = document.getElementById('dlg-turn-' + focus.indexes[0]);
        target && target.scrollIntoView && target.scrollIntoView({block: 'center', behavior: 'smooth'});
        let timer = setTimeout(() => setFocus(null), 2400);
        return () => clearTimeout(timer);
    }, [focus, section]);

    // Реплика перематывает запись на своё начало и сразу запускает её:
    // человек нажал, чтобы услышать, а не чтобы потом искать кнопку «Play».
    // clip - вопрос из «Обзора»: запись играет только его отрезок и встаёт на конце.
    let clipEnd = useRef(null);
    let [clipKey, setClipKey] = useState(null);
    function playFrom(turn, clip = null) {
        let el = player.current;
        if (!el) return;
        clipEnd.current = clip && typeof clip.endMs === 'number' ? clip.endMs : null;
        setClipKey(clip ? clip.key : null);
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
        if (clipEnd.current !== null && ms >= clipEnd.current) {
            clipEnd.current = null;
            setClipKey(null);
            pause();
        }
        let index = turnIndexAt(turns, ms);
        setPlayingIndex(prev => prev === index ? prev : index);
        // Шкале хватает точности до секунды - чаще перерисовывать незачем.
        let second = Math.floor(ms / 1000) * 1000;
        setCurrentMs(prev => prev === second ? prev : second);
    }

    // Реплика одинакова в ленте и в блоке вопроса: index - место в ленте разбора
    // (-1 у реплики, которую блок принёс текстом), по нему подсвечивается звучащая.
    function renderTurn(turn, index, key, followUp) {
        let isClient = normalizedRole(turn.role) === 'client';
        let turnMarkers = isClient && Array.isArray(turn.markerIds)
            ? turn.markerIds.map(id => markersById.get(id)).filter(Boolean)
            : [];
        // По вопросам балл и мягкая оценка уже стоят в шапке вопроса, поэтому у
        // реплики они только в сплошной ленте.
        let inFeed = isClient && index > -1 && !byQuestions;
        let answerScore = inFeed ? scores.get(index) : null;
        let flag = inFeed ? flags.get(index) : null;
        // В режиме связывания реплика кандидата не раскрывается, а становится ответом.
        let target = Boolean(linkingBlock) && isClient && index > -1
            && !linkingBlock.items.some(item => item.index === index);
        let activate = () => target ? attach(index) : onOpenTurn(openTurn === key ? null : key);
        return <React.Fragment key={key}>
            <div
                className={styles.turn}
                id={index > -1 && !byQuestions ? 'dlg-turn-' + index : undefined}
                data-role={normalizedRole(turn.role)}
                data-playing={media && index > -1 && playingIndex === index ? 'true' : undefined}
                data-followup={followUp ? 'true' : undefined}
                data-focused={focus && focus.indexes.includes(index) ? 'true' : undefined}
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
                <div className={styles.turnHead}>
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
                <span className={styles.turnMeta}>
                    <TurnTime turn={turn}/>
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
                </span>
                </div>
                {rolePicker === key && <RolePopover
                    role={normalizedRole(turn.role)}
                    onPick={role => {
                        setRolePicker(null);
                        role !== normalizedRole(turn.role) && onAssignRole(speakerKey(turn), role);
                    }}
                    onClose={() => setRolePicker(null)}
                />}
                {isUnrecognizedTurn(turn)
                    ? <p className={styles.turnText} data-empty="true" title={UNRECOGNIZED_TURN_HINT}>{UNRECOGNIZED_TURN_TEXT}</p>
                    : <p className={styles.turnText}>{turn.text}</p>}
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

    let durationMs = interviewDuration(summary, turns);
    let tracks = conversationTracks(turns, durationMs, scores, flags, turnParts(blocks, turns));
    let questionsCount = scoredBlocks.length;
    let questionsLabel = questionsCount + ' ' + (questionsCount % 10 === 1 && questionsCount % 100 !== 11 ? 'вопрос'
        : [2, 3, 4].includes(questionsCount % 10) && ![12, 13, 14].includes(questionsCount % 100) ? 'вопроса' : 'вопросов');
    let linkingNotice = linkingBlock && <div className={styles.linking} role="status">
        <span><strong>Связываем</strong> ответ с вопросом {linkingBlock.number} — нажмите на реплику кандидата</span>
        <button type="button" className={styles.linkingCancel} onClick={() => setLinking(null)}>Отмена · Esc</button>
    </div>;

    return <>
        <div className={styles.metrics}>
            <div><span>Реплики</span><strong>{turns.length}</strong></div>
            <div><span>Длительность</span><strong>{formatDuration(summary.durationMs || 0)}</strong></div>
            <div><span>Замечания</span><MarkersMetric markers={markers}/></div>
            <div><span>Участники</span><strong>{roleSummary(turns)}</strong></div>
        </div>

        <EmotionSummary sources={summary.emotionSources}/>

        {/* Док как в карточке звонка: запись и вкладки разделов одним блоком,
            при закреплении он едет вместе со скроллом. */}
        <div className={styles.player} data-pinned={pinned ? 'true' : 'false'} data-media={media ? media.kind : 'none'}>
            {media && <div className={styles.playerRow} data-kind={view}>
                <div className={styles.playerIntro}>
                    <span className={styles.playerIcon} aria-hidden="true"><WaveIcon/></span>
                    <div className={styles.playerCopy}>
                        <strong>{media.kind === 'video' ? 'Видео интервью' : 'Запись интервью'}</strong>
                        <span className={styles.playerHint}>Нажмите ▶ у реплики, чтобы услышать её с начала</span>
                    </div>
                    {media.kind === 'video' && <button
                        type="button"
                        role="switch"
                        className={styles.audioSwitch}
                        aria-checked={audioOnly}
                        aria-label="Только аудио"
                        title={audioOnly ? 'Показать видео' : 'Слушать запись без картинки'}
                        onClick={toggleAudioOnly}
                    >
                        <span className={styles.audioSwitchTrack} aria-hidden="true">
                            <span className={styles.audioSwitchKnob}><HeadphonesIcon/></span>
                        </span>
                        <span>Только аудио</span>
                    </button>}
                </div>
                {view === 'video'
                    ? <video ref={player} src={media.src} controls preload="metadata" onTimeUpdate={onTimeUpdate} onPlay={() => setPaused(false)} onPause={() => setPaused(true)} onEnded={() => setPaused(true)}/>
                    : <CallPlayer ref={player} src={media.src} onTimeUpdate={onTimeUpdate} onPlay={() => setPaused(false)} onPause={() => setPaused(true)} onEnded={() => setPaused(true)}/>}
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
            </div>}
            <nav className={styles.sectionTabs} aria-label="Разделы разбора интервью">
                {[['overview', 'Обзор', scoredBlocks.length], ['dialog', 'Диалог', turns.length]].map(([key, label, count]) => <button
                    key={key}
                    type="button"
                    className={styles.sectionTab}
                    aria-current={section === key ? 'page' : undefined}
                    onClick={() => setSection(key)}
                >{label}<span className={styles.tabCounter}>{count}</span></button>)}
            </nav>
        </div>

        {section === 'overview' && <section className={styles.panel} aria-label="Обзор">
            <header className={styles.panelHead}>
                <div className={styles.heading}>
                    <span className={styles.eyebrow}>Результаты</span>
                    <h4 className={styles.sectionTitle}>
                        Вопросы {scoredBlocks.length > 0 && <span className={styles.countChip}>{questionsLabel}</span>}
                    </h4>
                </div>
                <span className={styles.panelNote}>Нажмите на балл, чтобы увидеть детализацию ответа</span>
            </header>
            {scoredBlocks.length > 0
                ? <div className={styles.panelBody}>
                    {linkingNotice}
                    <div className={styles.qaList}>
                        {scoredBlocks.map(block => <QaBlock
                            key={block.key}
                            block={block}
                            interviewId={interviewId}
                            seriesStart={seriesStarts.has(block.key)}
                            mocks={mockMarks ? mockMarks.get(block.number) : null}
                            linking={linking === block.key}
                            onFindAnswer={() => {
                                // Ответ выбирают из ленты: в «Обзоре» реплик нет.
                                setLinking(linking === block.key ? null : block.key);
                                linking !== block.key && setSection('dialog');
                            }}
                            playing={media && !paused && clipKey === block.key}
                            onPlay={media && block.startMs !== null
                                ? () => (!paused && clipKey === block.key ? pause() : playFrom({startMs: block.startMs}, block))
                                : null}
                            onOpenDialog={() => openInDialog(block)}
                        />)}
                    </div>
                </div>
                : <p className={styles.empty}>Вопросы появятся после оценки ответов — запустите «Оценить ответы» выше.</p>}
        </section>}

        {section === 'dialog' && <section className={styles.panel} aria-label="Диалог">
            <header className={styles.panelHead}>
                <div className={styles.heading}>
                    <span className={styles.eyebrow}>Расшифровка</span>
                    <h4 className={styles.sectionTitle}>
                        Диалог <span className={styles.countChip}>{turnsCountLabel(turns.length)}</span>
                    </h4>
                </div>
                <span className={styles.panelNote}>Нажмите ▶ у реплики, чтобы прослушать только этот фрагмент</span>
            </header>
            {tracks.length > 0 && <ConversationTimeline
                tracks={tracks}
                parts={partSegments(blocks, turns, durationMs)}
                durationMs={durationMs}
                currentMs={media ? currentMs : null}
                playingIndex={media && !paused ? playingIndex : -1}
                onSelect={segment => {
                    media && playFrom({startMs: segment.startMs});
                    let target = document.getElementById('dlg-turn-' + segment.index);
                    target && target.scrollIntoView && target.scrollIntoView({block: 'center', behavior: 'smooth'});
                }}
            />}
            {linkingNotice && <div className={styles.panelBody}>{linkingNotice}</div>}
            <div className={styles.turns}>
                {turns.map((turn, index) => renderTurn(turn, index, turn.id || index, false))}
            </div>
        </section>}

        {hasRecordingSignals(capabilities) && <div className={styles.signalsGrid}>
            <AcousticEvents capability={capabilities.acousticEvents}/>
            <Capabilities capabilities={capabilities}/>
        </div>}
    </>;
}

// «Ход разговора» из карточки звонка: дорожка на роль, реплика - отрезок, цвет -
// связь с оценкой ответа. Наведение показывает реплику строкой ниже, клик - слушать.
const TONE_LABELS = {speech: 'Речь без замечаний', warning: 'Средний балл или замечание', critical: 'Слабый ответ или мимо вопроса'};

function ConversationTimeline({tracks, parts = [], durationMs, currentMs, playingIndex, onSelect}) {
    let [peek, setPeek] = useState(null);
    // Выключенные в легенде оценки приглушают отрезки, как линза «Техника»/«Поведение»
    // приглушала вопросы: остальное видно, но не спорит.
    let [mutedTones, setMutedTones] = useState(() => new Set());
    // Секция под курсором на полосе секций - её название во всплывающей подсказке.
    let [section, setSection] = useState(null);
    let all = tracks.flatMap(track => track.segments.map(segment => ({...segment, label: track.label})));
    let shown = peek !== null ? all.find(segment => segment.index === peek)
        : all.find(segment => segment.index === playingIndex);
    let playhead = currentMs !== null && currentMs > 0 ? timelinePosition(currentMs, durationMs) : null;
    function toggleTone(tone) {
        setMutedTones(prev => {
            let next = new Set(prev);
            next.has(tone) ? next.delete(tone) : next.add(tone);
            return next;
        });
    }
    return <div className={styles.review}>
        <div className={styles.reviewHead}>
            <h5>Ход разговора</h5>
            <span>Наведите для просмотра · нажмите, чтобы прослушать</span>
        </div>
        <div className={styles.reviewControls}>
            <div className={styles.reviewLegend} role="group" aria-label="Шкала оценок">
                <span>Шкала оценок:</span>
                {Object.keys(TONE_LABELS).map(tone => <button
                    key={tone}
                    type="button"
                    className={styles.legendToggle}
                    aria-pressed={!mutedTones.has(tone)}
                    title={mutedTones.has(tone) ? 'Показать на шкале' : 'Приглушить на шкале'}
                    onClick={() => toggleTone(tone)}
                ><i data-tone={tone}/>{TONE_LABELS[tone]}</button>)}
            </div>
        </div>
        {parts.length > 0 && <div className={styles.reviewTrack}>
            <span>Секция</span>
            <div className={styles.partLane} role="group" aria-label="Секции интервью">
                {parts.map(segment => <span
                    key={segment.key}
                    className={styles.partSegment}
                    data-part={segment.part}
                    data-active={section && section.key === segment.key ? 'true' : undefined}
                    style={{left: segment.left + '%', width: segment.width + '%'}}
                    aria-label={PART_LABELS[segment.part]}
                    onMouseEnter={() => setSection(segment)}
                    onMouseLeave={() => setSection(null)}
                />)}
                {section && <span
                    className={styles.sectionPopover}
                    role="tooltip"
                    style={{left: Math.min(Math.max(section.left + section.width / 2, 8), 92) + '%'}}
                >
                    <strong>{PART_LABELS[section.part]}</strong>
                    <span>{formatDuration(section.startMs)}–{formatDuration(section.endMs)}</span>
                </span>}
            </div>
        </div>}
        {tracks.map(track => <div className={styles.reviewTrack} key={track.role}>
            <span>{track.label}</span>
            <div className={styles.reviewLane} role="group" aria-label={'Реплики: ' + track.label}>
                {playhead !== null && <i className={styles.reviewPlayhead} style={{left: playhead + '%'}} aria-hidden="true"/>}
                {track.segments.map(segment => <button
                    key={segment.index}
                    type="button"
                    className={styles.reviewSegment}
                    data-tone={segment.tone}
                    data-dimmed={segmentMuted(segment, 'all', mutedTones) ? 'true' : undefined}
                    data-active={segment.index === peek || segment.index === playingIndex ? 'true' : undefined}
                    style={{left: segment.left + '%', width: 'max(3px, ' + segment.width + '%)', maxWidth: (100 - segment.left) + '%'}}
                    aria-label={track.label + ', ' + formatDuration(segment.startMs) + '–' + formatDuration(segment.endMs) + '. ' + TONE_LABELS[segment.tone]}
                    onMouseEnter={() => setPeek(segment.index)}
                    onMouseLeave={() => setPeek(null)}
                    onFocus={() => setPeek(segment.index)}
                    onBlur={() => setPeek(null)}
                    onClick={() => onSelect(segment)}
                />)}
            </div>
        </div>)}
        <div className={styles.reviewTicks} aria-hidden="true">
            <span>{formatDuration(0)}</span><span>{formatDuration(durationMs / 2)}</span><span>{formatDuration(durationMs)}</span>
        </div>
        <div className={styles.reviewCurrent}>{shown
            ? <span>▶ {formatDuration(shown.startMs)} · {shown.label} — {shown.text}</span>
            : <span>Цвета показывают оценку ответов, а не эмоции. Манеру общения можно проверить, прослушав запись.</span>}</div>
    </div>;
}

// Вопрос интервью строкой «Обзора», как момент в карточке звонка: сам диалог не
// раскрывается - его слушают кнопкой ▶ и открывают в ленте кнопкой «К диалогу».
// Под вопросом - тема и основные замечания бейджами, справа - балл.
const KIND_LABELS = {true: 'Технический', false: 'Нетехнический', null: 'Тема не определена'};

function QaBlock({block, interviewId, mocks = null, seriesStart = false, lens = 'all', linking = false, onFindAnswer, playing = false, onPlay = null, onOpenDialog}) {
    let {evaluation} = block;
    let missing = withoutAnswer(block);
    // В строке - короткая версия вопроса, полный текст - в подсказке и в ленте диалога.
    let title = questionTitle(block);
    let shortTitle = shortQuestionTitle(title);
    let remarks = questionRemarks(block);
    let playLabel = playing ? 'Пауза' : 'Прослушать вопрос с ' + formatDuration(block.startMs || 0);
    return <section
        id={'dlg-q-' + block.key}
        className={styles.qaBlock}
        data-technical={String(block.technical)}
        data-dimmed={lensDimmed(lens, block.technical) ? 'true' : undefined}
        data-playing={playing ? 'true' : undefined}
        aria-label={'Вопрос ' + block.number}
    >
        <header className={styles.qaHead}>
            {onPlay && <button
                type="button"
                className={styles.qaPlay}
                aria-label={playLabel}
                title={playLabel}
                aria-pressed={playing}
                onClick={onPlay}
            >{playing ? '❚❚' : '▶'}</button>}
            <div className={styles.qaTitle}>
                <strong className={styles.qaQuestion} title={title}>{shortTitle}</strong>
                <span className={styles.qaKind} data-technical={String(block.technical)}>
                    {KIND_LABELS[String(block.technical)]}
                </span>
                {remarks.length > 0 && <ul className={styles.softMarks} aria-label="Замечания к ответу">
                    {remarks.map(mark => <li key={mark.key} className={styles.softMark} data-tone={mark.tone} title={mark.hint || undefined}>{mark.text}</li>)}
                </ul>}
                {showsBehavior(lens) && seriesStart && <span className={styles.flag} data-kind="evasive">Серия пропусков</span>}
                <WeakMockMark mocks={mocks}/>
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
                {onOpenDialog && <button type="button" className={styles.qaJump} onClick={onOpenDialog}>К диалогу</button>}
            </div>
        </header>
        {evaluation.state === 'error' && <p className={styles.qaError}>
            Ответ не оценён: {evaluation.message || 'сервис оценки не сообщил причину.'}
        </p>}
        {block.soft && block.soft.state === 'error' && <p className={styles.qaError}>
            Ответ не оценён: {block.soft.message || 'оценка не сообщила причину.'}
        </p>}
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
// Балл - кнопка: у технического ответа по клику открывается модалка с полным
// разбором, как на странице /interviews/:id/answers/:number; у нетехнического -
// попап, из чего сложилась оценка.
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
        {evaluation.relevance === undefined && interviewId && <InterviewAnswerModal
            interviewId={interviewId}
            number={open ? number : null}
            onClose={close}
        />}
        {open && evaluation.relevance === undefined && !interviewId && <AnswerBriefPopover
            evaluation={evaluation}
            href=''
            onClose={close}
        />}
    </div>;
}

// Мягкая оценка нетехнического ответа - балл той же шкалой, что у технического
// вопроса. Проблемные отметки стоят бейджами под вопросом (questionRemarks).

function SoftMarks({soft}) {
    if (soft.state === 'unanswered') return null;
    if (soft.state === 'skipped') return <span className={styles.qaStatus}>Не оцениваем</span>;
    if (soft.state === 'pending') return <span className={styles.qaStatus} data-state="pending">
        <span className={styles.spinner} aria-hidden="true"/>Оцениваем
    </span>;
    if (soft.state === 'missing') return <span className={styles.qaStatus}>Без оценки</span>;
    if (soft.state === 'error') return <span className={styles.qaStatus} data-state="error">Ошибка оценки</span>;

    return <QaScore evaluation={soft}/>;
}

// Итог интервью: общий балл и сводка, рядом - отметки приветствия и прощания, ниже -
// цифры разговора. Первое, что читают на карточке, поэтому стоит над всем остальным.
function InterviewSummary({overall, greeting, metrics, summarizing}) {
    let band = overall ? scoreBand(overall.score, overall.max) : 'none';
    let scored = Boolean(overall) && overall.score !== null;
    return <section className={styles.summary} data-band={band} data-scored={scored ? 'true' : undefined} aria-label="Итог интервью">
        <div className={styles.summaryMain}>
        <header className={styles.summaryHead}>
            <div className={styles.heading}>
                <span className={styles.eyebrow}>Разбор записи</span>
                <h3 className={styles.summaryTitle}>Итог интервью</h3>
            </div>
            {greeting && <ul className={styles.courtesy} aria-label="Приветствие и прощание">
                <CourtesyMark value={greeting.greeted} yes="Приветствие есть" no="Приветствия нет" unknown="Приветствие не определено"/>
                <CourtesyMark value={greeting.farewelled} yes="Прощание есть" no="Прощания нет" unknown="Прощание не определено"/>
            </ul>}
        </header>

        {overall
            ? <div className={styles.summaryBody}>
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
        </div>
        {scored && <aside className={styles.summaryAside}>
            <span className={styles.summaryAsideLabel}>Итоговая оценка</span>
            <SummaryScore score={overall.score} max={overall.max} basis={overall.basis} parts={overall.parts}/>
        </aside>}
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
            <div><dt>общение</dt><dd>{formatScore(parts.soft)}</dd></div>
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

    return <div className={styles.details} data-side={normalizedRole(turn.role) === 'client' ? 'right' : 'left'}>
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

// Время реплики в шапке пузыря. Начало и конец - отдельными узлами: по началу
// реплику ищут глазами, конец только подсказывает её длину.
function TurnTime({turn}) {
    let {from, to} = turnTimeRange(turn);
    return <span className={styles.turnTime}>
        <span>{from}</span>{to && <>–<span>{to}</span></>}
    </span>;
}

function HeadphonesIcon() {
    return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 15v-3a8 8 0 0 1 16 0v3"/>
        <path d="M4 15h3v5H5a1 1 0 0 1-1-1zM20 15h-3v5h2a1 1 0 0 0 1-1z"/>
    </svg>;
}

function WaveIcon() {
    return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M3 10v4M7 7v10M11 4v16M15 8v8M19 10v4"/>
    </svg>;
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
