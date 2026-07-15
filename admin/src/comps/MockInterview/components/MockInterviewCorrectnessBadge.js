import React from 'react';
import styles from '../mockInterview.module.scss';

const MockInterviewCorrectnessBadge = ({ passed }) => {
    if (passed == null) return null;

    return (
        <span className={`${styles.correctnessBadge} ${passed ? styles.badgeSuccess : 'incorrect'}`}>
            {passed ? 'Верно' : 'Неверно'}
        </span>
    );
};

export default MockInterviewCorrectnessBadge;
