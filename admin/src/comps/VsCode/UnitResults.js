import React, {useState} from "react";
import Button from "../../libs/Button";

export function UnitResults({details, on_close, on_continue_course, on_skip}) {
    let [forceStatus, setForceStatus] = useState('')
    let [open, setOpen] = useState(null)
    let info = details?._data?._data || {};
    let status = info?.total == info.passed ? 'ok' : 'err'
    if (!info?.total) {
        return t('loading')
    }
    return <>
        {t('status')}: {t('status')}.
            <div>
                {t('pass_success')}: {info?.passed} {t('from')} {info?.total}
            </div>

            {status == 'err' && <>
                {t('Необходимо решить задачу правильно')}
                <div>

                </div>
                <Button size={'sm'} onClick={(scb) => {
                    scb && scb();
                    on_close()
                }}>{t('close')}</Button>
                <Button
                    size={'sm'}
                    onClick={(scb) => {
                       on_skip && on_skip(scb)
                    }}>{t('Пропустить задачу')}</Button>
            </>}
            {(setForceStatus === 'skip' || status == 'ok') && <>
                <hr/>
                <Button size={'sm'} onClick={(scb) => {
                    scb && scb();
                    on_close()
                }}>{t('close')}</Button>
                <Button size={'sm'} onClick={(scb) => {
                    scb && scb();
                    on_continue_course()
                }}>{t('continue_courses')}</Button>
            </>}
            <hr/>

            <small onClick={() => {
                setOpen(!open)
            }}>{t('details')}</small>
            {open && !!details && <pre>{JSON.stringify(details, null, 4)}</pre>}
    </>
}

