import React from 'react';
import styles from '../mockInterview.module.scss';

const MockInterviewQuestionList = ({ turns, selectedIndex, onSelect }) => {
    return (
        <div className={'card'}>
            <div className={'card-body'}>
                <div className="menuGroupHeader"><b>{t('questions')}</b></div>
                {turns.map((turn, ind) => (
                    <div
                        key={turn.turn_id || ind}
                        className={'menuList ' + (ind === selectedIndex ? 'activeList' : '')}
                        onClick={() => onSelect(ind)}
                    >
                        <div className={styles.questionItemRow}>
                            <strong>{'Вопрос #' + (ind + 1)}</strong>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MockInterviewQuestionList;
