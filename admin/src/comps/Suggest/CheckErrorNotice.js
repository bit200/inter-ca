import React from 'react';
import './checkError.scss';

// Явный сбой проверки (api: checkError {code, message}): песочница/раннер/эталон не отработали.
// Это не fail решения, поэтому вместо тестов показываем отдельное предупреждение.
export function isCheckError(x) {
    return !!x && typeof x === 'object' && !!x.checkError;
}

// variant: 'run' — «Запустить»/«Сдать»; 'candidate' — сданный экзамен; 'mentor' — история экзамена у ментора;
// 'exam' — баннер ментору на весь экзамен (count — число непроверенных задач).
export function CheckErrorNotice({variant = 'run', compact = false, count}) {
    let text = variant === 'candidate' ? t('checkErrorCandidate')
        : variant === 'mentor' ? t('checkErrorMentor')
        : variant === 'exam' ? t('checkErrorExamMentor')
        : t('checkErrorRun');
    let isExam = variant === 'exam';
    return <div role="alert" data-testid={isExam ? 'exam-check-error-notice' : 'check-error-notice'} data-variant={variant}
                className={'checkErrorNotice' + (compact ? ' compact' : '') + (isExam ? ' exam' : '')}>
        {!isExam && <i className="iconoir-warning-triangle"></i>}
        <div>
            <b>{t('checkErrorTitle')}{isExam ? ': ' + count : ''}</b>
            <div>{text}</div>
        </div>
    </div>
}

export default CheckErrorNotice;
