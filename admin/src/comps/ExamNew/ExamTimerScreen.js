import MyImg from "../MyImg";
import React from "react";
import Skeleton from "../../libs/Skeleton/Skeleton";
import {getExamId} from "./GetExamId";

export function ExamTimerScreen ({exam, getMinutes}) {
    return <>
        <hr/>
        {t('exam')} #{getExamId()}
        <div>
            {t('completeTime')}: {getMinutes(exam)} {t('minutesShort')}
        </div>
    </>
}

