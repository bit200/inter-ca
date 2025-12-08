import MyImg from "../MyImg";
import React from "react";
import Button from "../../libs/Button";

export function WaitToStartExam() {
    return <>
        <div>
            <div style={{marginTop: '20px', paddingBottom: '20px'}}>
                <img src="/st/lock.svg" alt="" style={{width: '300px'}}/>
            </div>

            {t('waitToStartExam')}
            <div style={{marginTop: '20px'}}></div>

            <Button size='sm' icon={'iconoir-double-check'} disabled={true}>{t('startExan')}</Button>

        </div>
    </>
}

