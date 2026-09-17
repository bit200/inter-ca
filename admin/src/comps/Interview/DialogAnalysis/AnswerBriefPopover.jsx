import React, {useEffect, useRef, useState} from 'react';
import styles from './dialogAnalysis.module.scss';
import {formatScore, scoreBand, softBreakdown, SOFT_HINTS} from './qaBlocks';
import {answerBrief, loadEvaluationReference} from './answerBrief';
import {markerCounts, markerLabel} from './dialogAnalysisFormat';

const SEGMENTS = 5;

// Попап под баллом технического вопроса: короткая детализация оценки - за что
// поставлен балл, - и ссылка на страницу с полным разбором ответа.
// Клик мимо и Escape закрывают попап; сам балл закроет его своим переключением.
function useDismiss(box, onClose) {
    useEffect(() => {
        function onDown(event) {
            let target = event.target;
            if (box.current && box.current.contains(target)) return;
            if (target.closest && target.closest('[aria-expanded="true"]')) return;
            onClose();
        }
        function onKey(event) {
            event.key === 'Escape' && onClose();
        }
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [box, onClose]);
}

export default function AnswerBriefPopover({evaluation, href, onClose}) {
    let box = useRef(null);
    let [reference, setReference] = useState(null);

    useEffect(() => {
        let alive = true;
        loadEvaluationReference().then(value => alive && setReference(value));
        return () => { alive = false; };
    }, []);

    useDismiss(box, onClose);

    let brief = answerBrief(evaluation.result, reference ? reference.schemas : [], reference ? reference.rules : []);
    let score = brief.score === null ? evaluation.score : brief.score;
    let max = brief.score === null ? evaluation.max : brief.max;

    function open(event) {
        // Обычный клик - переход внутри кабинета; с Ctrl/Cmd ссылка откроется во вкладке.
        if (!global.navigate || event.metaKey || event.ctrlKey || event.shiftKey) return;
        event.preventDefault();
        global.navigate(href);
    }

    return <div
        ref={box}
        className={styles.brief}
        role="dialog"
        aria-label="Детализация оценки"
        data-band={scoreBand(score, max)}
        onClick={event => event.stopPropagation()}
    >
        <div className={styles.briefHead}>
            <span className={styles.briefVerdict}>{brief.verdict || 'Оценка ответа'}</span>
            <span className={styles.briefScore}>{formatScore(score)}<small> из {formatScore(max)}</small></span>
        </div>

        {!reference && <p className={styles.briefNote}>Загружаем показатели…</p>}
        {reference && brief.rows.length > 0 && <ul className={styles.briefRows}>
            {brief.rows.map(row => {
                let filled = Math.round(row.pct / 100 * SEGMENTS);
                return <li key={row.group} data-band={scoreBand(row.pct, 100)}>
                    <span className={styles.briefLabel}>{row.label}</span>
                    <span className={styles.briefBar} aria-hidden="true">
                        {Array.from({length: SEGMENTS}, (_, cell) => <i key={cell} data-on={cell < filled ? 'true' : undefined}/>)}
                    </span>
                    <span className={styles.briefPct}>{row.pct}%</span>
                </li>;
            })}
        </ul>}

        {brief.criticalErrors.length > 0 && <div className={styles.briefCritical}>
            <b>Критическая ошибка</b>
            <p>{brief.criticalErrors[0]}</p>
        </div>}

        {brief.advice && <div className={styles.briefAdvice}>
            <b>Что подтянуть: {brief.advice.label.toLowerCase()}</b>
            <p>{brief.advice.text}</p>
        </div>}

        {href && <a className={styles.briefLink} href={href} onClick={open}>Открыть полный разбор ответа</a>}
    </div>;
}

// Название показателя с подсказкой, что он означает: всплывает при наведении
// и при фокусе с клавиатуры. Подсказка рисуется только пока видна, чтобы её
// текст не примешивался к названию.
function HintLabel({hint, className, children}) {
    let [shown, setShown] = useState(false);
    if (!hint) return <span className={className}>{children}</span>;
    let show = () => setShown(true);
    let hide = () => setShown(false);
    return <span
        className={`${className || ''} ${styles.briefHint}`}
        tabIndex={0}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
    >
        {children}
        {shown && <span className={styles.briefHintPop} role="tooltip">{hint}</span>}
    </span>;
}

// Раскладка балла нетехнического вопроса для модалки разбора: сервис баллов не
// ставит, балл сведён из отметок - показываем, сколько дала каждая и где сумму
// поправила полоса уровня, а рядом «Подачу» - штрафы за паразитов, речевые сбои
// и паузы - и вес обеих частей.
export function SoftBrief({evaluation}) {
    let {rows, raw, content, delivery, score, max, weights} = softBreakdown(evaluation);
    let percent = weight => Math.round(weight * 100) + '%';
    return <div
        className={styles.brief}
        data-place="page"
        role="region"
        aria-label="Детализация оценки"
        data-band={scoreBand(score, max)}
    >
        <div className={styles.briefHead}>
            <span className={styles.briefVerdict}>Из чего сложилась оценка</span>
            <span className={styles.briefScore}>{formatScore(score)}<small> из {formatScore(max)}</small></span>
        </div>

        <section className={styles.briefPart} aria-label="Содержание" data-band={scoreBand(content, max)}>
            {delivery && <div className={styles.briefPartHead}>
                <HintLabel hint={SOFT_HINTS.content}>Содержание <small>вес {percent(weights.content)}</small></HintLabel>
                <span className={styles.briefPoints}>{formatScore(content)}<small> из {formatScore(max)}</small></span>
            </div>}
            <ul className={styles.briefRows} data-kind="points">
                {rows.map(row => <li key={row.key} data-band={scoreBand(row.points, row.max)}>
                    <HintLabel className={styles.briefLabel} hint={SOFT_HINTS[row.key]}>{row.label}</HintLabel>
                    <span className={styles.briefPoints}>+{formatScore(row.points)}<small> из {formatScore(row.max)}</small></span>
                </li>)}
            </ul>
            {raw !== content && <p className={styles.briefNote}>
                {raw > content
                    ? `Сумма ${formatScore(raw)}, но ответ ${evaluation.relevance === 'off_topic' ? 'не по вопросу' : evaluation.relevance === 'evasive' ? 'уклончивый' : 'формальный'} — балл ограничен ${formatScore(content)}.`
                    : `Сумма ${formatScore(raw)} поднята до ${formatScore(content)} — нижней границы для такого ответа.`}
            </p>}
        </section>

        {delivery && <section className={styles.briefPart} aria-label="Подача" data-band={scoreBand(delivery.score, delivery.max)}>
            <div className={styles.briefPartHead}>
                <HintLabel hint={SOFT_HINTS.delivery}>Подача <small>вес {percent(weights.delivery)}</small></HintLabel>
                <span className={styles.briefPoints}>{formatScore(delivery.score)}<small> из {formatScore(delivery.max)}</small></span>
            </div>
            <ul className={styles.briefRows} data-kind="points">
                {delivery.rows.map(row => <li key={row.key} data-band={row.penalty ? 'fair' : 'good'}>
                    <HintLabel className={styles.briefLabel} hint={SOFT_HINTS[row.key]}>{row.label}</HintLabel>
                    <span className={styles.briefPoints}>{row.penalty ? '−' + formatScore(row.penalty) : '0'}</span>
                </li>)}
            </ul>
            {score < content && <p className={styles.briefNote}>
                {`Подача весит ${percent(weights.delivery)} балла: снято ${formatScore(Math.round((content - score) * 10) / 10)} из ${formatScore(content)}.`}
            </p>}
        </section>}
    </div>;
}

// Попап под числом замечаний: сколько каких видов, от частых к редким.
export function MarkersPopover({markers, onClose}) {
    let box = useRef(null);
    useDismiss(box, onClose);

    let counts = markerCounts(markers).sort((a, b) => b.count - a.count);
    return <div
        ref={box}
        className={styles.brief}
        data-place="start"
        role="dialog"
        aria-label="Замечания по видам"
        onClick={event => event.stopPropagation()}
    >
        <div className={styles.briefHead}>
            <span className={styles.briefVerdict}>Замечания по видам</span>
            <span className={styles.briefScore}>{markers.length}</span>
        </div>

        <ul className={styles.briefRows} data-kind="points">
            {counts.map(({category, count}) => <li key={category || 'other'}>
                <span className={styles.briefLabel}>{markerLabel(category)}</span>
                <span className={styles.briefPoints}>{count}</span>
            </li>)}
        </ul>
    </div>;
}
