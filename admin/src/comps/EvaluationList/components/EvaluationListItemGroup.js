import React, {useState} from 'react';
import {Link} from "react-router-dom";
import s from '../evaluationList.module.scss';
import { STATUS_LABEL, STATUS_COLOR } from '../../EvaluationDetail/evaluationStatus';

function getQuestionTitle(item) {
    const ti = item.titleInfo || {};
    return ti.title || ti.smallTitle || ti.desc || `Вопрос #${item.question}`;
}


const EvaluationListItemGroup = ({ examId, label, items, groupMode }) => {
    const [collapsed, setCollapsed] = useState(true);
    // error-записи молча ретраятся сами (см. EvaluationDetail.js/бэкенд) и нигде
    // не отображаются - значит и в "X/Y" их учитывать не надо: иначе "2/7" с
    // 5 невидимыми error-записями читается как "ещё 5 не оценено", хотя на самом
    // деле их просто не видно. Считаем total/done только по видимым записям.
    const visibleItems = items.filter(item => item.evaluate?.status !== 'error');
    const done = visibleItems.filter(it => it.evaluate?.status === 'done').length;
    const total = visibleItems.length;
    const allDone = total > 0 && done === total;
    const hasProcessing = visibleItems.some(it => it.evaluate?.status === 'processing');

    const progressColor = allDone ? STATUS_COLOR.done : hasProcessing ? STATUS_COLOR.processing : STATUS_COLOR.pending;

    return (
        <div className={'card'}>
            <div className={`${s.group} card-body`}>
                <div className={s.groupHeader} onClick={() => setCollapsed(c => !c)}
                     data-testid="evaluation-group-header" data-group-label={label}>
                    <i className={`iconoir-nav-arrow-${collapsed ? 'right' : 'down'} ${s.groupHeaderArrow}`}/>
                    {examId ? (
                        <Link to={`/quiz/${examId}`} onClick={e => e.stopPropagation()} className={s.groupHeaderLabel}>
                            {label}
                        </Link>
                    ) : (
                        <span className={s.groupHeaderLabel}>{label}</span>
                    )}
                    <span className={s.groupHeaderProgress} style={{ color: progressColor }}>
                    {done}/{total}
                        {hasProcessing && ' · оценивается...'}
                        {allDone && ' · готово'}
                </span>
                </div>

                {!collapsed && (
                    <div className={s.groupBody}>
                        {visibleItems.map(item => {
                            const ev = item.evaluate || {};
                            const score = ev.result?.score;
                            const scoreColor = score >= 7 ? STATUS_COLOR.done : score >= 4 ? STATUS_COLOR.processing : STATUS_COLOR.error;
                            return (
                                <div key={item._id} className={s.groupItem}>
                                    <Link to={`/evaluations/${item._id}`}
                                          state={{ groupMode }}
                                          data-testid="evaluation-group-item" data-item-id={item._id}
                                          className={`text-truncate ${s.groupItemLink}`}>
                                        {getQuestionTitle(item)}
                                    </Link>
                                    <span className={s.groupItemStatus}
                                          style={{ color: STATUS_COLOR[ev.status] || STATUS_COLOR.pending }}>
                                        {STATUS_LABEL[ev.status] || ev.status}
                                    </span>
                                    {score != null && (
                                        <span className={s.groupItemScore} style={{ color: scoreColor }}>
                                        {score}/10
                                    </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EvaluationListItemGroup;
