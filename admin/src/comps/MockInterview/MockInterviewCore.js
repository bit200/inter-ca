import React, {useEffect, useRef, useState} from 'react';
import styles from './mockInterview.module.scss';
import sse from '../../libs/sse/sse';
import MockInterviewIframe from "./components/MockInterviewIframe";
import MockInterviewResults from "./components/MockInterviewResults";
import MockInterviewStartCard from "./components/MockInterviewStartCard";
import MockInterviewAttemptHistory from "./components/MockInterviewAttemptHistory";

const PASSED_STATUSES = ['completed', 'evaluated'];

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
    // сам - см. handleSelect: список истории кликабельный, и смотреть прошлый
    // результат можно, не уходя со страницы.
    const [activeAttemptId, setActiveAttemptId] = useState(attemptId);
    const [item, setItem] = useState(null);
    const [history, setHistory] = useState([]);
    const [active, setActive] = useState(null);
    const [completedLocally, setCompletedLocally] = useState(false);
    const [startError, setStartError] = useState(null);
    const [botBusy, setBotBusy] = useState(false);
    const [retaking, setRetaking] = useState(false);
    const autoStartedRef = useRef(false);
    const reservedRef = useRef(false);
    const itemRef = useRef(null);
    itemRef.current = item;

    useEffect(() => {
        setActiveAttemptId(attemptId);
    }, [attemptId]);

    useEffect(() => {
        // Ту попытку, что уже показана, не перечитываем: продолжение и ретейк
        // сами кладут в item свежий документ и сразу заводят его в старт - а
        // сброс item в null тут заново запустил бы автостарт по той же попытке
        // (вторая бронь того же бота).
        if (itemRef.current && itemRef.current._id === activeAttemptId) return;
        setItem(null);
        autoStartedRef.current = false;
        global.http.get(`/mock-interview/my-list/${activeAttemptId}`).then(setItem);
    }, [activeAttemptId]);

    // Live per-question статус оценки (pending/processing/done/error), без перезагрузки
    // страницы - та же схема, что EvaluationDetail.js для QuizHistory. Первичную полную
    // загрузку item по-прежнему делает effect выше, здесь только патчим evaluate/evaluateState.
    useEffect(() => {
        if (!activeAttemptId) return;
        return sse.subscribe(`/mock-interview/${activeAttemptId}/evaluate-events`, ({evaluate, evaluateState}) => {
            setItem(prev => prev && {...prev, evaluate, evaluateState});
        });
    }, [activeAttemptId]);

    // История прошлых попыток по этому interviewId - грузим отдельно от самой
    // попытки, т.к. /my-list/:id отдаёт только один документ. filter[...] -
    // общий для проекта способ фильтрации списков (см. getList в itk-platform-en).
    useEffect(() => {
        if (!item || !item.interviewId) return;
        global.http.get('/mock-interview/my-list', { filter: { interviewId: item.interviewId } }, { wo_notify: true })
            .then(r => setHistory(r.items || []))
            .catch(() => {});
    }, [item?.interviewId]);

    // Перечитать попытку целиком - нужен результатам после точечного
    // перезапуска оценки одного вопроса.
    const reloadItem = () => global.http
        .get(`/mock-interview/my-list/${activeAttemptId}`, {}, { wo_notify: true })
        .then(setItem)
        .catch(() => {});

    const isPassed = !!item && (PASSED_STATUSES.includes(item.status) || completedLocally);

    // history может быть чуть более старым снимком, чем текущий item (например
    // сразу после handleComplete/handleRetake) - подменяем в нём запись текущей
    // попытки на актуальный item, чтобы список и статус на экране не расходились.
    const mergedHistory = history.map(attempt => (attempt._id === item?._id ? item : attempt))
        .sort((a, b) => new Date(b.cd) - new Date(a.cd));
    const latestAttempt = mergedHistory[0] || item;
    const latestCompleted = !!latestAttempt && PASSED_STATUSES.includes(latestAttempt.status);

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

    // Бэкенд создаёт одноразовый embed_url через issuer-токен ITK_EMBED_API_KEY
    // (см. docs/contracts/embed-interview-iframe.md в itk-live) — сам токен
    // на фронт никогда не попадает, iframe открывается сразу на готовый embed_url.
    const startAttempt = (attemptItem) => {
        setStartError(null);
        setBotBusy(false);
        return global.http.post(`/mock-interview/my-list/${attemptItem._id}/reserve`, {}, { wo_notify: true })
            .then(() => {
                reservedRef.current = true;
                return global.http.post(`/mock-interview/my-list/${attemptItem._id}/embed-session`, {
                    parentOrigin: window.location.origin,
                }, { wo_notify: true });
            })
            .then((session) => {
                global.http.put(`/mock-interview/my-list/${attemptItem._id}`, {
                    sessionId: session.sessionId,
                    status: 'started',
                }, { wo_notify: true });
                setActive({ ...attemptItem, embedUrl: session.embedUrl, sessionId: session.sessionId });
            })
            .catch(e => {
                if (reservedRef.current) {
                    releaseReservation();
                }
                const isBusy = e?.error === 'busy';
                const message = isBusy
                    ? 'Интервью сейчас занято другим пользователем. Попробуйте открыть позже.'
                    : 'Не удалось забронировать интервью. Попробуйте ещё раз.';
                global.notify.warning(message);
                setStartError(message);
                setBotBusy(isBusy);
            });
    };

    useEffect(() => {
        if (item && item.interviewId && !isPassed && !autoStartedRef.current) {
            autoStartedRef.current = true;
            startAttempt(item);
        }
    }, [item, isPassed]);

    const handleComplete = () => {
        releaseReservation();
        global.http.put(`/mock-interview/my-list/${itemRef.current._id}`, { status: 'completed' }, { wo_notify: true }).catch(() => {});
        setItem(prev => ({ ...prev, status: 'completed' }));
        setActive(null);
        setCompletedLocally(true);
        onComplete && onComplete(itemRef.current._id);
    };

    const handleCloseIframe = () => {
        releaseReservation();
        setActive(null);
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

    // Переключение на другую (уже завершённую) попытку того же интервью:
    // перечитываем её целиком по id - в списке /my-list лежат только шапки
    // попыток, без turns/evaluate, а результаты рисуются именно по ним.
    // Незавершённые попытки сюда не попадают: их открывает "Продолжить",
    // который заодно бронирует бота (см. handleContinue).
    const handleSelect = (attempt) => {
        if (!attempt || attempt._id === item?._id) return;
        setCompletedLocally(false);
        setStartError(null);
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
                onSelect={handleSelect}
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
