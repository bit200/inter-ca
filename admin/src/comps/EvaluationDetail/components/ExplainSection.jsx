import React, { useState } from 'react';
import styles from '../evaluationDetail.module.scss';

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
const ExplainSection = ({ onExplain, buttonLabel = 'Расшифровать оценку' }) => {
    const [status, setStatus] = useState('idle'); // idle | loading | done | not_ready | error
    const [explain, setExplain] = useState(null);

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

    return (
        <div className={styles.explainWrapper}>
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
                        {explain ? 'Обновить расшифровку' : buttonLabel}
                    </>
                )}
            </button>

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
                        {(explain.components || []).length > 0 && (
                            <div className={styles.explainComponents}>
                                {explain.components.map((c, i) => (
                                    <div key={i} className={styles.explainComponentItem}>
                                        <div className={styles.explainComponentHeader}>
                                            <span className={styles.explainComponentName}>{c.name}</span>
                                            {c.score != null && (
                                                <span className={styles.explainComponentScore}>{c.score}</span>
                                            )}
                                        </div>
                                        {c.verdict && <div className={styles.explainComponentVerdict}>{c.verdict}</div>}
                                        {c.suggestion && <div className={styles.explainComponentSuggestion}>{c.suggestion}</div>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExplainSection;
