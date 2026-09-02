import React from "react";

// Концепт А «Дорожка» из docs/concepts/dashboard-progress: под плитками шапки
// идёт горизонтальная полоса во всю ширину. Над ней - подпись «Прогресс» и
// счёт: процент и «62 из 148 топиков». Всё значение читается сразу, без
// наведения: всплывающей панели у полосы нет (задача #956).
function ProgressTrack({ value, done, total, unit, title }) {
    let tr = (key, def) => (global.t ? global.t(key) : '') || def;

    let perc = Math.max(0, Math.min(100, Math.round(value || 0)));
    let isDone = perc >= 100;

    return (
        <div className={'pbar' + (isDone ? ' pbarDone' : '')}
             role="progressbar" aria-valuenow={perc} aria-valuemin={0} aria-valuemax={100}
             aria-label={title || tr('completionPerc', '% изучения')}>
            <div className="pbarHead">
                <span className="pbarLabel">{tr('progress', 'Прогресс')}</span>
                <span className="pbarCount">
                    <b className="pbarPerc">{perc}%</b>
                    <span className="pbarOf">{done || 0} {tr('ofWord', 'из')} {total || 0} {unit}</span>
                </span>
            </div>
            <div className="pbarTrack"><i style={{ width: perc + '%' }}></i></div>
        </div>
    );
}

export default ProgressTrack;
