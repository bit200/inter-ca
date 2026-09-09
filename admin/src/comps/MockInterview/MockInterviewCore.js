import React, {useEffect, useRef, useState} from 'react';
import styles from './mockInterview.module.scss';
import sse from '../../libs/sse/sse';
import MockInterviewIframe from "./components/MockInterviewIframe";
import MockInterviewResults from "./components/MockInterviewResults";
import MockInterviewStartCard from "./components/MockInterviewStartCard";
import MockInterviewAttemptHistory from "./components/MockInterviewAttemptHistory";
import {startInterviewAttempt} from "./startInterviewAttempt";
import {jobsByQuestion} from "./components/evaluateJobState";
import {isAttemptFinished} from "./components/attemptStatus";
import {rememberInterrupted} from "./components/attemptInterrupted";

// Вынесено из MockInterview.js (страница /mock-interviews/:id), чтобы ту же
// проверку занятости бота (reserve -> busy) и старт/завершение/ретейк попытки
// можно было переиспользовать не только на отдельной странице, но и встроенным
// табом в CourseQuiz (после последнего модуля курса) - без дублирования
// логики. Разница между использованиями только в том, откуда берётся
// исходный attemptId и что делать при ретейке (см. onRetake) и по завершении
// интервью (см. onComplete, опционален - используется CourseQuiz, чтобы
// закрыть модалку курса и увести на полноценную страницу результатов).
function MockInterviewCore({attemptId, onRetake, onComplete}) {
    // Какую попытку показываем сейчас. Приходит извне (id из URL или из таба
    // курса), но экран умеет переключаться на другую попытку того же интервью
    // сам (см. handleOpenResults) - и тогда за ней должны пойти и подписка на
    // live-оценку, и перечитывание, иначе они остались бы на прошлой попытке.
    const [activeAttemptId, setActiveAttemptId] = useState(attemptId);
    const [item, setItem] = useState(null);
    const [history, setHistory] = useState([]);
    const [active, setActive] = useState(null);
    const [completedLocally, setCompletedLocally] = useState(false);
    const [startError, setStartError] = useState(null);
    const [botBusy, setBotBusy] = useState(false);
    const [retaking, setRetaking] = useState(false);
    const [historyLoaded, setHistoryLoaded] = useState(false);
    const autoStartedRef = useRef(false);
    const reservedRef = useRef(false);
    const itemRef = useRef(null);
    itemRef.current = item;

    useEffect(() => {
        setActiveAttemptId(attemptId);
    }, [attemptId]);

    useEffect(() => {
        // Ту попытку, что уже показана, не перечитываем: переключение из истории
        // и ретейк сами кладут в item нужный документ, а сброс item в null тут
        // моргнул бы экраном загрузки поверх уже готовых результатов.
        if (itemRef.current && itemRef.current._id === activeAttemptId) return;
        setItem(null);
        autoStartedRef.current = false;
        global.http.get(`/mock-interview/my-list/${activeAttemptId}`).then(setItem);
    }, [activeAttemptId]);

    // Live per-question статус оценки (pending/processing/done/error), без перезагрузки
    // страницы - та же схема, что EvaluationDetail.js для QuizHistory. Первичную полную
    // загрузку item по-прежнему делает effect выше, здесь только патчим evaluate/evaluateState.
    //
    // evaluate-events шлёт снапшот статуса джобов (pending/processing/done/error), а не
    // расшифровку - explain на джобу кладётся только начальной загрузкой /my-list/:id
    // (после клика "Расшифровать оценку" или если она была сгенерирована раньше). Если
    // просто заменить evaluateState целиком, любое SSE-событие после монтирования сотрёт
    // уже показанный explain и заставит расшифровку нажимать заново - поэтому мёржим jobs
    // по questionId и сохраняем explain из предыдущего состояния там, где SSE его не прислало.
    useEffect(() => {
        if (!activeAttemptId) return;
        return sse.subscribe(`/mock-interview/${activeAttemptId}/evaluate-events`, ({evaluate, evaluateState}) => {
            setItem(prev => {
                if (!prev) return prev;
                const prevJobs = jobsByQuestion(prev.evaluateState);
                const mergedJobs = (evaluateState?.jobs || []).map(job => ({
                    ...job,
                    explain: job.explain ?? prevJobs[job.questionId]?.explain ?? null,
                }));
                return {...prev, evaluate, evaluateState: {...evaluateState, jobs: mergedJobs}};
            });
        });
    }, [activeAttemptId]);

    // История прошлых попыток по этому interviewId - грузим отдельно от самой
    // попытки, т.к. /my-list/:id отдаёт только один документ. filter[...] -
    // общий для проекта способ фильтрации списков (см. getList в itk-platform-en).
    useEffect(() => {
        if (!item || !item.interviewId) return;
        global.http.get('/mock-interview/my-list', { filter: { interviewId: item.interviewId } }, { wo_notify: true })
            .then(r => setHistory(r.items || []))
            .catch(() => {})
            .finally(() => setHistoryLoaded(true));
    }, [item?.interviewId]);

    // Перечитать попытку целиком - нужен результатам после точечного
    // перезапуска оценки одного вопроса.
    const reloadItem = () => global.http
        .get(`/mock-interview/my-list/${activeAttemptId}`, {}, { wo_notify: true })
        .then(setItem)
        .catch(() => {});

    // Попытка считается пройденной не только по статусу: та, что застряла в
    // "Начато" с уже разобранным диалогом, тоже должна открываться результатами,
    // а не карточкой старта (см. isAttemptFinished).
    const isPassed = !!item && (isAttemptFinished(item) || completedLocally);

    // history может быть чуть более старым снимком, чем текущий item (например
    // сразу после handleComplete/handleRetake) - подменяем в нём запись текущей
    // попытки на актуальный item, чтобы список и статус на экране не расходились.
    const mergedHistory = history.map(attempt => (attempt._id === item?._id ? item : attempt))
        .sort((a, b) => new Date(b.cd) - new Date(a.cd));
    const latestAttempt = mergedHistory[0] || item;
    const latestCompleted = isAttemptFinished(latestAttempt);

    // releaseReservation прогоняем через обычный http (переживает SPA-навигацию),
    // releaseReservationOnUnload — через fetch(keepalive), т.к. это единственный способ
    // пронести Authorization-заголовок и не потерять запрос при закрытии вкладки/reload
    // (navigator.sendBeacon кастомные заголовки не поддерживает).
    const releaseReservation = () => {
        if (!reservedRef.current || !itemRef.current) return;
        reservedRef.current = false;
        global.http.post(`/mock-interview/my-list/${itemRef.current._id}/release`, {}, { wo_notify: true }).catch(() => {});
    };

    const releaseReservationOnUnload = () => {
        if (!reservedRef.current || !itemRef.current) return;
        reservedRef.current = false;
        try {
            fetch(`${window.env.domain}/api/mock-interview/my-list/${itemRef.current._id}/release`, {
                method: 'POST',
                keepalive: true,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': global.user.get_token(),
                },
                body: '{}',
            }).catch(() => {});
        } catch (e) {}
    };

    useEffect(() => {
        window.addEventListener('pagehide', releaseReservationOnUnload);
        return () => {
            window.removeEventListener('pagehide', releaseReservationOnUnload);
            releaseReservation();
        };
    }, []);

    const startAttempt = (attemptItem) => {
        setStartError(null);
        setBotBusy(false);
        return startInterviewAttempt(attemptItem, {
            onReserve: () => { reservedRef.current = true; },
            onRelease: releaseReservation,
        })
            .then(setActive)
            .catch(err => {
                global.notify.warning(err.message);
                setStartError(err.message);
                setBotBusy(!!err.busy);
            });
    };

    // Автостарт - удобство только для самой первой попытки: человек открыл
    // интервью, и оно сразу пошло. Когда попыток уже несколько, он пришёл на
    // экран за историей и результатами, и самозапуск повторного интервью тут
    // мешает - решение принимает он сам кнопкой на карточке старта. Ждём
    // загрузки истории, иначе автостарт успеет сработать на пустом списке.
    useEffect(() => {
        if (!historyLoaded || history.length > 1) return;
        if (item && item.interviewId && !isPassed && !autoStartedRef.current) {
            autoStartedRef.current = true;
            startAttempt(item);
        }
    }, [item, isPassed, historyLoaded, history.length]);

    // Закрыли окно интервью - значит статус сессии у меша уже можно узнать, а не
    // ждать фоновую догоняющую проверку: та не трогает попытки моложе двух минут
    // (MESH_CHECK_MIN_AGE_MS в services/mockInterviewStaleQueue.js) и ходит раз в
    // минуту, из-за чего попытка до трёх минут висела в "Начато". Ручка спрашивает
    // меш прямо сейчас, закрывает попытку при терминальной сессии и отдаёт
    // актуальную запись - кладём её в item, чтобы экран сразу показал результаты.
    // Ошибку гасим молча (wo_notify, как соседние вызовы): не смогли спросить -
    // попытку через минуту-другую закроет фон, кандидату об этом знать незачем.
    const syncAttempt = (syncId) => {
        if (!syncId) return Promise.resolve();
        return global.http.post(`/mock-interview/my-list/${syncId}/sync`, {}, { wo_notify: true })
            .then(r => {
                const synced = r && r.item ? r.item : r;
                if (!synced || !synced._id) return;
                setItem(prev => (prev && prev._id === synced._id ? synced : prev));
            })
            .catch(() => {});
    };

    // interrupted приходит из окна интервью: true - кандидат вышел сам, не
    // дойдя до последнего вопроса. Запоминаем это вместе с завершением - иначе
    // на странице результатов прерванная попытка ничем не отличается от
    // короткой пройденной (см. attemptInterrupted.js).
    const handleComplete = ({ interrupted = false } = {}) => {
        releaseReservation();
        const completedId = itemRef.current._id;
        rememberInterrupted(completedId, interrupted);
        // sync только после PUT - иначе меш мог бы ответить раньше, чем попытка
        // перешла в completed, и вернуть уже устаревшую запись.
        global.http.put(`/mock-interview/my-list/${completedId}`, { status: 'completed', interrupted }, { wo_notify: true })
            .catch(() => {})
            .then(() => syncAttempt(completedId));
        setItem(prev => ({ ...prev, status: 'completed', interrupted }));
        setActive(null);
        setCompletedLocally(true);
        onComplete && onComplete(completedId);
    };

    const handleCloseIframe = () => {
        releaseReservation();
        const closedId = itemRef.current && itemRef.current._id;
        setActive(null);
        syncAttempt(closedId);
    };

    // Резолвит существующую (draft/active/started) или создаёт новую попытку для
    // того же interviewId (см. контракт POST /mock-interview/my-list в
    // itk-platform-en) и сразу заводит её в тот же reserve -> embed-session поток,
    // что и обычный старт - startAttempt сам разрулит "busy" и прочие ошибки брони.
    // onRetake - опциональный колбэк для вызывающей стороны (например страница
    // /mock-interviews/:id хочет обновить URL); сам компонент работает и без него,
    // переключаясь на новую попытку локально.
    const handleRetake = () => {
        setRetaking(true);
        global.http.post('/mock-interview/my-list', { interviewId: item.interviewId }, { wo_notify: true })
            .then(({ item: newItem }) => {
                setHistory(prev => [newItem, ...prev.filter(attempt => attempt._id !== newItem._id)]);
                setCompletedLocally(false);
                setItem(newItem);
                setActiveAttemptId(newItem._id);
                onRetake && onRetake(newItem._id);
                return startAttempt(newItem);
            })
            .catch(() => {
                global.notify.warning('Не удалось начать новую попытку. Попробуйте ещё раз.');
            })
            .finally(() => setRetaking(false));
    };

    // Продолжение ранее начатой попытки из списка истории: попытка со статусом
    // "Начато" остаётся живой на стороне бота, но открыть её было нечем - экран
    // всегда показывал только ту попытку, что пришла в attemptId. Делаем ровно
    // то же, что handleRetake, только без создания новой попытки: переключаем
    // экран на выбранную и заводим её в тот же reserve -> embed-session поток.
    const handleContinue = (attempt) => {
        setCompletedLocally(false);
        setStartError(null);
        setItem(attempt);
        setActiveAttemptId(attempt._id);
        onRetake && onRetake(attempt._id);
        startAttempt(attempt);
    };

    // Переход к результатам прошлой попытки прямо из истории: раньше экран
    // умел показывать только ту попытку, что пришла в attemptId, и вернуться к
    // оценке предыдущей было нечем. Переключаем экран на выбранную попытку -
    // на странице /mock-interviews/:id onRetake заодно поправит адрес, и попытка
    // перечитается целиком; во встроенном табе хватает записи из истории.
    const handleOpenResults = (attempt) => {
        setActive(null);
        setStartError(null);
        setBotBusy(false);
        setCompletedLocally(false);
        autoStartedRef.current = true;
        setItem(attempt);
        setActiveAttemptId(attempt._id);
        onRetake && onRetake(attempt._id);
    };

    //todo use loader from project
    if (!item) {
        return <div className={styles.container}>Loading...</div>;
    }

    return (
        <>
            {isPassed && <MockInterviewResults interview={item} onRefresh={reloadItem}/>}
            {!isPassed && <MockInterviewStartCard item={item} error={startError} busy={botBusy} onStart={() => startAttempt(item)}/>}
            <MockInterviewAttemptHistory
                history={mergedHistory}
                currentItem={item}
                latestCompleted={latestCompleted}
                retaking={retaking}
                onRetake={handleRetake}
                onContinue={handleContinue}
                onOpenResults={handleOpenResults}
            />
            {active && <MockInterviewIframe
                interview={active}
                onClose={handleCloseIframe}
                onComplete={handleComplete}/>
            }
        </>
    );
}

export default MockInterviewCore;
