import React from "react";

// Концепт А «Дорожка» из docs/concepts/dashboard-progress: под плитками шапки
// идёт горизонтальная полоса во всю ширину. Над ней - подпись «Прогресс» и
// счёт: процент и «62 из 148 топиков», чтобы значение читалось сразу, без
// наведения. Остаток и статус завершения по-прежнему приходят на наведение:
// панель встаёт над полосой и перекрывает плитки. Открывается и с клавиатуры -
// полоса получает фокус.
function ProgressTrack({ value, done, total, unit, title }) {
    let tr = (key, def) => (global.t ? global.t(key) : '') || def;

    let perc = Math.max(0, Math.min(100, Math.round(value || 0)));
    let isDone = perc >= 100;
    let left = Math.max(0, (total || 0) - (done || 0));

    return (
        <div className={'pbar' + (isDone ? ' pbarDone' : '')} tabIndex={0}
             role="progressbar" aria-valuenow={perc} aria-valuemin={0} aria-valuemax={100}
             aria-label={title || tr('completionPerc', '% изучения')}>
            <div className="pbarPop">
                <div className="pbarPopRow">
                    <div>
                        <span className="pbarPopVal">{perc}</span>
                        <span className="pbarPopUnit">%</span>
                        <span className="pbarPopCap">{tr('passed', 'пройдено')}</span>
                    </div>
                    <div className="pbarPopSide">
                        <b>{done || 0}</b> {tr('ofWord', 'из')} <b>{total || 0}</b> {unit}
                    </div>
                </div>
                <p className="pbarPopFoot">
                    {isDone
                        ? tr('allTopicsDone', 'Все топики закрыты — подготовка завершена.')
                        : `${tr('leftCount', 'Осталось')} ${left} ${unit}`}
                </p>
            </div>
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
