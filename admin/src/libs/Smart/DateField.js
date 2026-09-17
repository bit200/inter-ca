import React from 'react';
import DayPicker from '../../comps/DayPicker/DayPicker';
import {mergeDayIntoValue} from '../../comps/DayPicker/dayPickerValue';

// Поле даты Smart-формы. Раньше здесь стоял react-datepicker (libs/Datepicker):
// голое поле «ДД/ММ/ГГГГ» без рамки и подписи, выбивавшееся из соседних инпутов.
// Теперь — селектор дня, перенесённый из админки aquagor: стрелки по бокам
// двигают дату на сутки, готовые дни стоят одной строкой, число видно словами,
// календарь открывается окном на body.
//
// Обязательное поле сбросить нельзя: у него пустая дата — это незаполненная
// форма, а не ответ.

function DateField({field = {}, label, value, error, className, onChange}) {
    const cls = ['smartDate', className, error ? 'inputWithError' : '']
        .filter(Boolean).join(' ');
    const title = label || field.label || field.name;

    return <div className={cls}>
        {!field.woLabel && title && <div><small>{t(title)}</small></div>}
        <DayPicker
            value={value}
            single={true}
            wide={true}
            steps={false}
            clearable={!field.required}
            ariaLabel={title || 'Дата'}
            onChange={(day) => onChange && onChange(mergeDayIntoValue(value, day))}/>
    </div>
}

export default DateField;
