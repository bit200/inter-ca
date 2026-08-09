import React, {useState} from 'react';
import {Link} from "react-router-dom";
import s from '../evaluationList.module.scss';

const STATUS_LABEL = { pending: 'Ожидает', processing: 'Оценивается...', done: 'Оценено', error: 'Ошибка' };
const STATUS_COLOR = { pending: '#999', processing: '#f0a500', done: '#2a9d2a', error: '#cc3333' };

function getQuestionTitle(item) {
    const ti = item.titleInfo || {};
    return ti.title || ti.smallTitle || ti.desc || `Вопрос #${item.question}`;
}


const EvaluationListItemGroup = ({ examId, label, items }) => {
    const [collapsed, setCollapsed] = useState(true);
    const done = items.filter(it => it.evaluate?.status === 'done').length;
    const total = items.length;
    const allDone = done === total;
    const hasProcessing = items.some(it => it.evaluate?.status === 'processing');

    const progressColor = allDone ? STATUS_COLOR.done : hasProcessing ? STATUS_COLOR.processing : '#999';

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
                        {items.map(item => {
                            const ev = item.evaluate || {};
                            const score = ev.result?.score;
                            const scoreColor = score >= 7 ? STATUS_COLOR.done : score >= 4 ? '#f0a500' : STATUS_COLOR.error;
                            return (
                                <div key={item._id} className={s.groupItem}>
                                    <Link to={`/evaluations/${item._id}`}
                                          data-testid="evaluation-group-item" data-item-id={item._id}
                                          className={`text-truncate ${s.groupItemLink}`}>
                                        {getQuestionTitle(item)}
                                    </Link>
                                    <span className={s.groupItemStatus}
                                          style={{ color: STATUS_COLOR[ev.status] || '#999' }}>
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
