import React, {useEffect, useState} from 'react';
import MockInterviewCore from "../MockInterview/MockInterviewCore";

// Последний шаг экзамена - мок-интервью, если оно привязано к шаблону экзамена
// (ExamTemplate.interviewId в itk-platform-en, приезжает в /load-exam). Попытку
// создаём/переиспользуем тем же POST /mock-interview/my-list, что и таб курса
// (CourseQuiz после последнего модуля), дальше всё - занятость бота, старт,
// ретейк, результаты - ведёт MockInterviewCore.
function RunExamInterviewStep({interviewId}) {
    let [attemptId, setAttemptId] = useState(null);
    let [failed, setFailed] = useState(false);

    useEffect(() => {
        if (!interviewId) {
            return;
        }
        setFailed(false);
        global.http.post('/mock-interview/my-list', {interviewId}, {wo_notify: true})
            .then(({item}) => setAttemptId(item._id))
            .catch(() => setFailed(true));
    }, [interviewId]);

    if (failed) {
        return <div className={'tc'}>{t('mockInterviewNotStarted')}</div>
    }

    if (!attemptId) {
        return <div className={'tc'}>{t('preparingMockInterview')}</div>
    }

    return <MockInterviewCore attemptId={attemptId} onRetake={setAttemptId}/>
}

export default RunExamInterviewStep;
