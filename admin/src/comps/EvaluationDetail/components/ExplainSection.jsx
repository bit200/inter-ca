import React, { useState } from 'react';
import { createPortal } from 'react-dom';
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
// `summarySlot` - DOM-узел для общего вывода расшифровки. На странице разбора
// ответа вывод - это фраза про сам ответ, поэтому он стоит отдельной карточкой
// прямо под "Как прошёл ответ", а не шапкой над вкладками параметров. Без слота
// вывод, как и раньше, остаётся первой строкой карточки расшифровки.
// `buttonSlot` - DOM-узел, в который отрендерить саму кнопку. На странице
// разбора ответа она стоит в шапке, рядом с баллом (главное действие экрана
// не должно теряться в конце ленты), а расшифровка появляется здесь же, на
// своём месте. Без слота кнопка, как и раньше, рендерится по месту.
const ExplainSection = ({ onExplain, buttonLabel = 'Расшифровать оценку', initialExplain = null, buttonSlot = null, summarySlot = null, buttonClassName = 'btn btn-outline-primary btn-sm' }) => {
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

    const button = !explain && (
                <button
                    onClick={handleClick}
                    disabled={status === 'loading'}
                    className={buttonClassName}
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
    );

    // Ненавязчивая сноска: разбор пишет модель, и ученик должен читать его как
    // подсказку, а не как приговор. Стоит подвалом карточки - её видно, когда
    // текст дочитан, и она не спорит с самим разбором.
    const aiNote = (
        <div className={styles.explainAiNote} data-testid="evaluate-explain-ai-note">
            <i className="iconoir-sparks"/>
            <span>Разбор и рекомендации составил ИИ — он может ошибаться</span>
        </div>
    );

    const summary = explain?.summary && (
        <div className={styles.explainSummary} data-testid="evaluate-explain-summary">{explain.summary}</div>
    );
    // Вынесённый вывод - самостоятельный блок, поэтому в слоте он едет вместе
    // с карточкой и подписью; по месту он остаётся строкой внутри чужой карточки.
    const summaryCard = summary && (
        <div className={`card ${styles.summaryCard}`}>
            <div className="card-body">
                <div className={styles.summaryTitle}>Вывод</div>
                {summary}
                {/* Одна сноска на экран: если рядом стоит карточка разбора,
                    подпись живёт там, под всем текстом сразу. */}
                {components.length === 0 && aiNote}
            </div>
        </div>
    );

    return (
        <div className={styles.explainWrapper}>
            {button && (buttonSlot ? createPortal(button, buttonSlot) : button)}
            {summaryCard && summarySlot && createPortal(summaryCard, summarySlot)}

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

            {/* Вывод мог уехать в слот - тогда карточка расшифровки нужна
                только ради разбора по параметрам. */}
            {explain && (components.length > 0 || (!summarySlot && explain.summary)) && (
                <div className={`card ${styles.explainCard}`} data-testid="evaluate-explain-result">
                    <div className="card-body">
                        {!summarySlot && summary}
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
                        {aiNote}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExplainSection;
