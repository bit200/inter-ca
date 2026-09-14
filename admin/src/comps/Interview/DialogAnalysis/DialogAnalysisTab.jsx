import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import styles from './dialogAnalysis.module.scss';
import {
    PIPELINE_STEPS,
    evaluateButtonState,
    isActiveStatus,
    normalizeAnalysis,
    stepState,
} from './dialogAnalysisState';
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
    markerCounts,
    markerLabel,
    normalizedRole,
    readConversation,
    roleSummary,
    speakerLabel,
} from './dialogAnalysisFormat';
import {pickDialogMedia, turnIndexAt} from './dialogMedia';

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
    done: 'Разбор готов. Реплики ниже — расшифровка записи с замечаниями.',
};

function analysisOf(interview) {
    let item = interview && typeof interview === 'object' ? interview : {};
    return item.dialogAnalysis || item.videoAnalysis || null;
}

export default function DialogAnalysisTab({item, interview}) {
    let value = interview || item || {};
    let interviewId = value._id;
    let hasVideo = Boolean(value.video || value.uploadVideo || value.videoId);

    let [analysis, setAnalysis] = useState(() => normalizeAnalysis(analysisOf(value)));
    let [sending, setSending] = useState(false);
    let [openTurn, setOpenTurn] = useState(null);
    let mounted = useRef(true);
    let media = pickDialogMedia(value, analysis);

    useEffect(() => () => { mounted.current = false; }, []);

    let apply = useCallback(payload => {
        if (!mounted.current) return;
        setAnalysis(normalizeAnalysis(payload && payload.dialogAnalysis ? payload.dialogAnalysis : payload));
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

    let button = evaluateButtonState(analysis, {hasVideo, sending});

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

    let conversation = useMemo(() => readConversation(analysis.result), [analysis.result]);
    let markersById = useMemo(() => {
        let map = new Map();
        conversation.markers.forEach(marker => marker && map.set(marker.id, marker));
        return map;
    }, [conversation.markers]);

    let hint = analysis.status
        ? STATUS_HINTS[analysis.status] || ''
        : hasVideo
            ? 'Разбор ещё не запускали. Кнопка отправит запись в очередь: мы достанем звук, распознаем речь и разделим реплики по участникам.'
            : 'Приложите ссылку на запись во вкладке «Меню» — без видео разбирать нечего.';

    return <div className={styles.tab}>
        <section className={styles.pipeline}>
            <div className={styles.pipelineHead}>
                <div>
                    <h3 className={styles.pipelineTitle}>Разбор диалога</h3>
                    {hint && <p className={styles.pipelineHint}>{hint}</p>}
                </div>
                {button.visible && <div className={styles.actions}>
                    <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={button.disabled}
                        onClick={evaluate}
                    >
                        {button.busy && <span className={styles.spinner} aria-hidden="true"/>}
                        {button.label === 'evaluateAgain' ? 'Оценить заново' : 'Оценить'}
                    </button>
                </div>}
            </div>

            {analysis.status !== '' && analysis.status !== 'error' && <ul className={styles.steps}>
                {PIPELINE_STEPS.map(step => <li
                    key={step}
                    className={styles.step}
                    data-state={stepState(step, analysis.status)}
                >
                    <span className={styles.stepDot}/>
                    {STEP_LABELS[step]}
                </li>)}
            </ul>}

            {analysis.status === 'error' && <div className={styles.failure}>
                <span className={styles.failureTitle}>
                    {analysis.retryable ? 'Сбой на нашей стороне — пробуем ещё раз' : 'Разбор остановлен'}
                </span>
                <span>{analysis.message || 'Причину очередь не сообщила.'}</span>
                {analysis.retryable && <span>Попыток сделано: {analysis.attempts || 1}. Вмешиваться не нужно.</span>}
            </div>}
        </section>

        {analysis.status === 'done' && <Result
            conversation={conversation}
            markersById={markersById}
            openTurn={openTurn}
            onOpenTurn={setOpenTurn}
            media={media}
        />}
    </div>;
}

function Result({conversation, markersById, openTurn, onOpenTurn, media}) {
    let {turns, markers, summary, capabilities} = conversation;
    let player = useRef(null);
    let [playingIndex, setPlayingIndex] = useState(-1);

    // Реплика перематывает запись на своё начало и сразу запускает её:
    // человек нажал, чтобы услышать, а не чтобы потом искать кнопку «Play».
    function playFrom(turn) {
        let el = player.current;
        if (!el) return;
        el.currentTime = Math.max(0, Number(turn.startMs || 0)) / 1000;
        let started = el.play && el.play();
        started && started.catch && started.catch(() => {});
    }

    function onTimeUpdate(event) {
        let index = turnIndexAt(turns, event.currentTarget.currentTime * 1000);
        setPlayingIndex(prev => prev === index ? prev : index);
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
            <div><span>Замечания</span><strong>{markers.length}</strong></div>
            <div><span>Участники</span><strong>{roleSummary(turns)}</strong></div>
        </div>

        <div className={styles.chips}>
            {markerCounts(markers).map(({category, count}) => <span
                key={category || 'other'}
                className={styles.chip}
            >{markerLabel(category)} · {count}</span>)}
            {!markers.length && <span className={styles.chip} data-severity="info">Замечаний не найдено</span>}
        </div>

        <EmotionSummary sources={summary.emotionSources}/>

        <h4 className={styles.sectionTitle}>Расшифровка</h4>
        <div className={styles.transcript} data-media={media ? media.kind : 'none'}>
        {media && <div className={styles.player}>
            {media.kind === 'video'
                ? <video ref={player} src={media.src} controls preload="metadata" onTimeUpdate={onTimeUpdate}/>
                : <audio ref={player} src={media.src} controls preload="metadata" onTimeUpdate={onTimeUpdate}/>}
            <p className={styles.playerHint}>
                {media.kind === 'video' ? 'Видео интервью' : 'Аудиозапись интервью'}: нажмите ▶ у реплики, чтобы услышать её с начала.
            </p>
        </div>}
        <div className={styles.turns}>
            {turns.map((turn, index) => {
                let key = turn.id || index;
                let turnMarkers = Array.isArray(turn.markerIds)
                    ? turn.markerIds.map(id => markersById.get(id)).filter(Boolean)
                    : [];
                return <React.Fragment key={key}>
                    <div
                        className={styles.turn}
                        data-role={normalizedRole(turn.role)}
                        data-playing={media && playingIndex === index ? 'true' : undefined}
                        role="button"
                        tabIndex={0}
                        onClick={() => onOpenTurn(openTurn === key ? null : key)}
                        onKeyDown={event => {
                            if (event.key !== 'Enter' && event.key !== ' ') return;
                            event.preventDefault();
                            onOpenTurn(openTurn === key ? null : key);
                        }}
                    >
                        <span className={styles.turnTime}>{formatDuration(turn.startMs || 0)}</span>
                        <span className={styles.turnSpeaker}>{speakerLabel(turn.role, turn.speaker)}</span>
                        <p className={styles.turnText}>{turn.text || '—'}</p>
                        {media && <button
                            type="button"
                            className={styles.turnPlay}
                            aria-label={'Воспроизвести с ' + formatDuration(turn.startMs || 0)}
                            title={'Воспроизвести с ' + formatDuration(turn.startMs || 0)}
                            onClick={event => {
                                // Кнопка живёт внутри реплики: без этого клик ещё и раскроет детали.
                                event.stopPropagation();
                                playFrom(turn);
                            }}
                            onKeyDown={event => event.stopPropagation()}
                        >▶</button>}
                        <TurnSignals turn={turn} markers={turnMarkers}/>
                    </div>
                    {openTurn === key && <TurnDetails turn={turn} markers={turnMarkers} onClose={() => onOpenTurn(null)}/>}
                </React.Fragment>;
            })}
        </div>
        </div>

        <div className={styles.signalsGrid}>
            <AcousticEvents capability={capabilities.acousticEvents}/>
            <Capabilities capabilities={capabilities}/>
        </div>
    </>;
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

function TurnDetails({turn, markers, onClose}) {
    let signals = turn.signals && typeof turn.signals === 'object' ? turn.signals : {};
    let prosody = signals.prosody && typeof signals.prosody === 'object' ? signals.prosody : null;
    let events = Array.isArray(signals.events) ? signals.events : [];
    let startMs = Number(turn.startMs || 0);
    let endMs = Math.max(startMs, Number(turn.endMs || startMs));

    return <div className={styles.details}>
        <div className={styles.detailsHead}>
            <strong>{speakerLabel(turn.role, turn.speaker)} · {formatDuration(startMs)}–{formatDuration(endMs)}</strong>
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
