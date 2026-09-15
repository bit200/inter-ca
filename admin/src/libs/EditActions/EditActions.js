import React, {useEffect, useRef, useState} from 'react';
import {saveLabel} from './saveSpots';
import './EditActions.css';

// «Назад» - тихая кнопка без заливки: она уводит со страницы и не должна
// спорить с «Сохранить» за внимание.
export function BackButton() {
    return <button type="button" className="edit-actions__back" onClick={() => global.navigate(-1)}>
        <i className="iconoir-arrow-left"></i>
        <span>{t('back')}</span>
    </button>
}

// «Сохранить» показывает, что произошло: «Сохраняю…», затем «Сохранено»
// на пару секунд. onSave возвращает промис запроса.
export function SaveButton({onSave}) {
    let [state, setState] = useState('idle');
    let timer = useRef(null);
    useEffect(() => () => clearTimeout(timer.current), []);

    function save() {
        if (state === 'saving') return;
        setState('saving');
        clearTimeout(timer.current);
        Promise.resolve(onSave && onSave())
            .then(() => {
                setState('saved');
                timer.current = setTimeout(() => setState('idle'), 2000);
            })
            .catch(() => setState('error'));
    }

    return <button type="button"
                   className={'edit-actions__save is-' + state}
                   disabled={state === 'saving'}
                   onClick={save}>
        <i className={state === 'saved' ? 'iconoir-double-check' : 'iconoir-check'}></i>
        <span>{t(saveLabel(state))}</span>
    </button>
}

export function EditActions({children, className = ''}) {
    return <div className={'edit-actions ' + className}>{children}</div>
}
