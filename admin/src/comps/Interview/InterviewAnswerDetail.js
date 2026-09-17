import React from 'react';
import {Link, useParams} from 'react-router-dom';

import InterviewAnswerView from './InterviewAnswer/InterviewAnswerView';

export {findAnswerBlock} from './InterviewAnswer/useInterviewAnswer';

// Страница разбора ответа: весь контент - InterviewAnswerView, та же вьюха
// открывается модалкой через InterviewAnswerModal.
export default function InterviewAnswerDetail() {
    const {id, number} = useParams();
    const back = <Link to={`/interviews/${id}?tab=dialog`} style={{fontSize: 13, color: 'var(--bs-text-muted)'}}>← Разбор диалога</Link>;
    return <InterviewAnswerView interviewId={id} number={number} header={back}/>;
}
