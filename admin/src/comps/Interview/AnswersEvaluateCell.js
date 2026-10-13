import React from 'react';

// Ячейка «Оценка» в списке интервью: готова ли оценка технических ответов.
// Состояние пишет очередь оценки (answersEvaluateState.status:
// queued -> grouping -> classifying -> evaluating -> done/error).
export function answersEvaluateLabel(item) {
    const status = item && item.answersEvaluateState && item.answersEvaluateState.status;
    if (!status) return {text: 'Не оценено', color: '#8a8f98'};
    if (status === 'done') return {text: 'Готова', color: '#1f9d55'};
    if (status === 'error') return {text: 'Ошибка', color: '#d64545'};
    return {text: 'Оценивается', color: '#c98a00'};
}

export default function AnswersEvaluateCell({item}) {
    const {text, color} = answersEvaluateLabel(item);
    return <span data-testid="answers-evaluate-cell" style={{color, fontWeight: 500}}>{text}</span>;
}
