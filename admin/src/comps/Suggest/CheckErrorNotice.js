import React from 'react';

// Явный сбой проверки (api: checkError {code, message}): песочница/раннер/эталон не отработали.
// Это не fail решения, поэтому вместо тестов показываем отдельное предупреждение.
export function isCheckError(x) {
    return !!x && typeof x === 'object' && !!x.checkError;
}

// variant: 'run' — «Запустить»/«Сдать»; 'candidate' — сданный экзамен; 'mentor' — история экзамена у ментора.
export function CheckErrorNotice({variant = 'run', compact = false}) {
    let text = variant === 'candidate' ? t('checkErrorCandidate')
        : variant === 'mentor' ? t('checkErrorMentor')
        : t('checkErrorRun');
    return <div role="alert" data-testid="check-error-notice" data-variant={variant}
                style={{
                    display: 'flex', gap: 8, alignItems: 'flex-start',
                    padding: compact ? '6px 10px' : '10px 14px', margin: '6px 0',
                    background: '#fff7e6', color: '#7a4b00',
                    borderLeft: '4px solid #f0a000', borderRadius: 0, fontSize: compact ? 12 : 14,
                }}>
        <i className="iconoir-warning-triangle" style={{marginTop: 2}}></i>
        <div>
            <b>{t('checkErrorTitle')}</b>
            <div>{text}</div>
        </div>
    </div>
}

export default CheckErrorNotice;
