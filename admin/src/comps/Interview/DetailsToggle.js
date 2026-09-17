import React from 'react';

// Пункт-переключатель «Детали» на вкладке «Обзор»: оценка интервью и топ-вопросы
// нужны не каждый раз, поэтому по умолчанию свёрнуты и не шумят под основными полями.
export default function DetailsToggle({open, onToggle, label = 'Детали'}) {
    return <button type="button"
                   className={'interviewDetailsToggle' + (open ? ' open' : '')}
                   aria-expanded={!!open}
                   onClick={() => onToggle && onToggle(!open)}>
        <span className="interviewDetailsChevron" aria-hidden="true">›</span>
        {label}
    </button>;
}
