import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {PIPELINE_STEPS, STEP_LABELS, isActiveStatus, normalizeAnalysis, stepState} from './DialogAnalysis/dialogAnalysisState';
import {TAB_PARAM} from './interviewTabs';
import {hasVideoLink, linkPipelineStep, linkPipelineView, shouldStartFromLink} from './videoLinkPipeline';

// Что происходит с записью, вписанной ссылкой: блок под полем «Видео ссылка»
// на вкладке «Данные». Вписал ссылку - здесь же видно, что запись ушла в
// очередь, скачивается и разбирается, а не пропала в никуда (см.
// videoLinkPipeline.js). Пока разбор идёт, статус перечитывается редко:
// работа считается часами, как и на «Обзоре».
const POLL_MS = 60000;

export default function InterviewVideoLinkStatus({interviewId, videoLink}) {
    let [searchParams, setSearchParams] = useSearchParams();
    let [analysis, setAnalysis] = useState(() => normalizeAnalysis(null));
    let [loaded, setLoaded] = useState(false);
    let [starting, setStarting] = useState(false);
    // Запуск по ссылке - один на карточку: повторно дёргать очередь незачем.
    let attempted = useRef(false);
    let mounted = useRef(true);

    useEffect(() => () => { mounted.current = false; }, []);

    let load = useCallback(() => {
        if (!interviewId || !global.http) return;
        // Разбора может ещё не быть - это обычное состояние, не сбой.
        global.http.get(`/my-interview/${interviewId}/dialog-analysis`, {}, {wo_notify: true})
            .then(payload => {
                if (!mounted.current) return;
                setAnalysis(normalizeAnalysis(payload && payload.dialogAnalysis ? payload.dialogAnalysis : payload));
            })
            .catch(() => {})
            .then(() => { mounted.current && setLoaded(true); });
    }, [interviewId]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        if (!isActiveStatus(analysis.status) && !starting) return undefined;
        let timer = setInterval(load, POLL_MS);
        return () => clearInterval(timer);
    }, [analysis.status, starting, load]);

    // Ссылка вписана, а разбор никто не запускал - отправляем запись в очередь
    // сами: человек прикрепил запись, значит ждёт оценки, а не ещё одной кнопки.
    useEffect(() => {
        if (!interviewId || !global.http) return;
        if (!shouldStartFromLink({videoLink, status: analysis.status, loaded, sending: starting, attempted: attempted.current})) return;
        attempted.current = true;
        setStarting(true);
        global.http.post(`/my-interview/${interviewId}/dialog-analysis`, {}, {wo_notify: true})
            .then(payload => {
                if (!mounted.current) return;
                let dialog = payload && payload.dialogAnalysis ? payload.dialogAnalysis : payload;
                setAnalysis(normalizeAnalysis(dialog && dialog.status ? dialog : {status: 'queued'}));
            })
            .catch(() => {})
            .then(() => { mounted.current && setStarting(false); });
    }, [interviewId, videoLink, analysis.status, loaded, starting]);

    if (!hasVideoLink(videoLink) || !interviewId) return null;

    let view = linkPipelineView({
        videoLink,
        status: analysis.status,
        message: analysis.message,
        starting,
    });
    if (!view) return null;

    let step = linkPipelineStep(analysis.status);
    let showSteps = view.tone === 'work';

    function openAnalysis() {
        let next = new URLSearchParams(searchParams);
        next.set(TAB_PARAM, 'dialog');
        setSearchParams(next, {replace: true});
    }

    return <div className="interviewLinkStatus" data-tone={view.tone}>
        <div className="interviewLinkStatusText">
            <span className="interviewLinkStatusTitle">{view.title}</span>
            <span className="interviewLinkStatusHint">{view.hint}</span>
        </div>

        {showSteps && <ul className="interviewLinkSteps">
            {PIPELINE_STEPS.map(name => <li
                key={name}
                className="interviewLinkStep"
                data-state={stepState(name, step)}
            >
                <span className="interviewLinkStepDot"/>
                {STEP_LABELS[name]}
            </li>)}
        </ul>}

        <button type="button" className="interviewLinkStatusAction" onClick={openAnalysis}>
            Открыть разбор
        </button>
    </div>;
}
