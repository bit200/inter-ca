import React, {useEffect, useRef, useState} from 'react';
import styles from './dialogAnalysis.module.scss';
import {formatScore, scoreBand} from './qaBlocks';
import {answerBrief, loadEvaluationReference} from './answerBrief';

const SEGMENTS = 5;

// Попап под баллом технического вопроса: короткая детализация оценки - за что
// поставлен балл, - и ссылка на страницу с полным разбором ответа.
export default function AnswerBriefPopover({evaluation, href, onClose}) {
    let box = useRef(null);
    let [reference, setReference] = useState(null);

    useEffect(() => {
        let alive = true;
        loadEvaluationReference().then(value => alive && setReference(value));
        return () => { alive = false; };
    }, []);

    useEffect(() => {
        // Клик мимо закрывает попап; сам балл закроет его своим переключением.
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
    }, [onClose]);

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
