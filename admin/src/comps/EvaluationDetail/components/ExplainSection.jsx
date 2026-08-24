import React, { useState } from 'react';
import styles from '../evaluationDetail.module.scss';
import { formatScore } from './formatScore';
import { explainComponentLabel } from './explainComponentLabel';

// scoreServiceITK's POST /evaluate/:id/explain answers 409 while the job isn't
// `completed` yet (a legitimate race, not a real error - see itk-platform-en's
// effects/evaluateService.js#explainEvaluate). global.http's rejection only
// carries the parsed body, not the HTTP status (see libs/http/http.js), so the
// "not ready" case is told apart from a real failure by the message text both
// proxy controllers use for it.
const NOT_READY_MARKERS = ['not completed yet', 'has not been submitted yet'];

function isNotReady(err) {
    const msg = err?.error || err?.msg || '';
    return NOT_READY_MARKERS.some(marker => msg.includes(marker));
}

// Shared "расшифровка оценки" button + result card - used both for a single
// QuizHistory answer (EvaluationDetail.js) and for one question of a
// MockInterview dialog attempt (MockInterviewEvaluationBlock.js). The two
// callers hit different scoreServiceITK-proxying endpoints with different
// ids, so the request itself is injected via `onExplain` rather than baked in
// here.
//
// The backend persists the LLM explanation the first time it's generated (see
// itk-platform-en's postEvaluateExplain/explainEvaluate) and returns the cached
// copy on every later call rather than re-running the LLM - so once `explain`
// exists (from `initialExplain` or a fresh click) there is deliberately no button
// to trigger another run. `initialExplain` lets a caller that already has it (from
// its own details fetch) show it immediately on page load, with no click required.
const ExplainSection = ({ onExplain, buttonLabel = 'Расшифровать оценку', initialExplain = null }) => {
    const [status, setStatus] = useState(initialExplain ? 'done' : 'idle'); // idle | loading | done | not_ready | error
    const [explain, setExplain] = useState(initialExplain);
    // null - вкладка "Все"; иначе индекс компонента в explain.components
    // (по индексу, а не по названию: LLM вполне может прислать два одинаковых).
    const [activeComponent, setActiveComponent] = useState(null);

    const handleClick = () => {
        setStatus('loading');
        onExplain()
            .then(data => {
                if (!data?.explain) {
                    setStatus('not_ready');
                    return;
                }
                setExplain(data.explain);
                setStatus('done');
            })
            .catch(err => {
                setStatus(isNotReady(err) ? 'not_ready' : 'error');
            });
    };

    const components = explain?.components || [];
    // Пара {c, i} - индекс нужен и для key, и чтобы вкладка знала, что подсветить,
    // когда список отфильтрован до одного компонента.
    const indexed = components.map((c, i) => ({ c, i }));
    const visibleComponents = activeComponent === null
        ? indexed
        : indexed.filter(({ i }) => i === activeComponent);

    return (
        <div className={styles.explainWrapper}>
            {!explain && (
                <button
                    onClick={handleClick}
                    disabled={status === 'loading'}
                    className="btn btn-outline-primary btn-sm"
                    data-testid="evaluate-explain-button"
                >
                    {status === 'loading' ? (
                        <>
                            <span className="spinner-border spinner-border-sm" role="status"/>
                            {' '}Расшифровываем...
                        </>
                    ) : (
                        <>
                            <i className="iconoir-sparks"/>{' '}
                            {buttonLabel}
                        </>
                    )}
                </button>
            )}

            {status === 'not_ready' && (
                <div className={styles.explainNotReady} data-testid="evaluate-explain-not-ready">
                    Оценка ещё не готова, попробуйте чуть позже
                </div>
            )}
            {status === 'error' && (
                <div className={styles.explainError} data-testid="evaluate-explain-error">
                    Не удалось получить расширенную оценку
                </div>
            )}

            {explain && (
                <div className={`card ${styles.explainCard}`} data-testid="evaluate-explain-result">
                    <div className="card-body">
                        {explain.summary && (
                            <div className={styles.explainSummary}>{explain.summary}</div>
                        )}
                        {components.length > 0 && (
                            <>
                                {components.length > 1 && (
                                    <ul className={`nav nav-tabs ${styles.explainTabs}`} role="tablist"
                                        data-testid="evaluate-explain-tabs">
                                        <li className="nav-item" role="presentation">
                                            <button type="button" role="tab"
                                                    aria-selected={activeComponent === null}
                                                    className={`nav-link fw-medium ${activeComponent === null ? 'active' : ''}`}
                                                    onClick={() => setActiveComponent(null)}>
                                                Все
                                            </button>
                                        </li>
                                        {components.map((c, i) => (
                                            <li className="nav-item" role="presentation" key={i}>
                                                <button type="button" role="tab"
                                                        aria-selected={activeComponent === i}
                                                        className={`nav-link fw-medium ${activeComponent === i ? 'active' : ''}`}
                                                        onClick={() => setActiveComponent(i)}>
                                                    {explainComponentLabel(c.name)}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                <div className={styles.explainComponents}>
                                    {visibleComponents.map(({ c, i }) => (
                                        <div key={i} className={styles.explainComponentItem}>
                                            <div className={styles.explainComponentHeader}>
                                                {/* Во вкладке одного параметра его название уже стоит
                                                    в самой вкладке - второй раз подписывать нечего. */}
                                                {activeComponent === null && (
                                                    <span className={styles.explainComponentName}>{explainComponentLabel(c.name)}</span>
                                                )}
                                                {c.score != null && (
                                                    <span className={styles.explainComponentScore}>{formatScore(c.score)}</span>
                                                )}
                                            </div>
                                            {c.verdict && <div className={styles.explainComponentVerdict}>{c.verdict}</div>}
                                            {c.suggestion && (
                                                <div className={styles.explainComponentSuggestion}>
                                                    <i className="iconoir-light-bulb-on"/>
                                                    <span>{c.suggestion}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExplainSection;
