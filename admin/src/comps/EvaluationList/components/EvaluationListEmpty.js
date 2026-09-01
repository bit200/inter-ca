import React from 'react';
import s from '../evaluationList.module.scss';

// Пустой экран - это не "нет данных", а подсказка, что делать дальше: карточка
// на белом фоне (как у групп оценок), объяснение, откуда берутся оценки, и
// переход на соседнюю вкладку - вторая вкладка часто не пустая.
const TEXTS = {
    exam: {
        title: 'Оценок по экзаменам пока нет',
        desc: 'Оценка появляется, когда студент отвечает на вопрос экзамена: ИИ разбирает ответ и ставит балл.',
        action: 'Смотреть по модулю',
        other: 'module',
    },
    module: {
        title: 'Оценок по модулям пока нет',
        desc: 'Оценка появляется, когда студент отвечает на вопрос модуля: ИИ разбирает ответ и ставит балл.',
        action: 'Смотреть по экзамену',
        other: 'exam',
    },
};

const EvaluationListEmpty = ({ groupMode, onSwitchMode }) => {
    const text = TEXTS[groupMode] || TEXTS.module;

    return (
        <div className="card" data-testid="evaluation-list-empty">
            <div className={`card-body ${s.empty}`}>
                <div className={s.emptyIcon}>
                    <i className="iconoir-sparks"/>
                </div>
                <div className={s.emptyTitle}>{text.title}</div>
                <div className={s.emptyDesc}>{text.desc}</div>
                <button type="button" className={`btn btn-light btn-sm ${s.emptyAction}`}
                        data-testid="evaluation-list-empty-switch"
                        onClick={() => onSwitchMode(text.other)}>
                    {text.action}
                </button>
            </div>
        </div>
    );
};

export default EvaluationListEmpty;
