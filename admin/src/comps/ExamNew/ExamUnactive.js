import MyImg from "../MyImg";
import React from "react";

export function ExamUnactive() {
    return <>
        <div className="card">
            <div className="card-body">
                <div style={{textAlign: 'center'}}>{t('notActiveExam')}</div>
            </div>
        </div>
    </>
}

