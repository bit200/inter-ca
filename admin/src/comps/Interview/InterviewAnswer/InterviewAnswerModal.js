import React from 'react';

import MyModal from '../../../libs/MyModal/MyModal';
import InterviewAnswerView from './InterviewAnswerView';

// Тот же разбор ответа, что на /interviews/:id/answers/:number, но поверх
// текущего экрана. Открыта, пока задан number.
export default function InterviewAnswerModal({interviewId, number, onClose}) {
    const isOpen = number != null;
    return (
        <MyModal isOpen={isOpen} onClose={onClose} size="full">
            {isOpen && <InterviewAnswerView interviewId={interviewId} number={number}/>}
        </MyModal>
    );
}
