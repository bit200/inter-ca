import React from 'react';
import styles from '../mockInterview.module.scss';

const MockInterviewQuestionList = ({ turns, selectedIndex, onSelect, failedCount = 0 }) => {
    return (
        <div className={'card'}>
            <div className={'card-body'}>
                <div className="menuGroupHeader"><b>{t('questions')}</b></div>
                {failedCount > 0 && (
                    <div className={styles.questionListNote}>
                        Без оценки: {failedCount} из {turns.length}
                    </div>
                )}
                {turns.map((turn, ind) => (
                    <div
                        key={turn.turn_id || ind}
                        className={'menuList ' + (ind === selectedIndex ? 'activeList' : '')}
                        onClick={() => onSelect(ind)}
                    >
                        <div className={styles.questionItemRow}>
                            <strong>{'Вопрос #' + (ind + 1)}</strong>
                            {turn.skipped && (
                                <span className={styles.questionItemSkipped}>пропущен</span>
                            )}
                            {!turn.skipped && turn.evaluateStatus === 'error' && (
                                <span className={styles.questionItemFailed}>без оценки</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MockInterviewQuestionList;
