import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MockInterviewEvaluationBlock from './MockInterviewEvaluationBlock';

jest.mock('../../EvaluationDetail/components/ScoreBar', () => ({ score }) => <div>score:{score}</div>);
jest.mock('../../EvaluationDetail/components/AdviceSection', () => () => <div>advice</div>);
jest.mock('../../EvaluationDetail/components/ExplainSection', () => () => <div>explain</div>);

describe('MockInterviewEvaluationBlock', () => {
    it('показывает оценку, даже если пачка оценки завершилась с ошибкой', () => {
        render(<MockInterviewEvaluationBlock evaluation={{ score: 6 }} evaluateStatus={'done'} interviewId={1000}/>);
        expect(screen.getByText('score:6')).toBeInTheDocument();
        expect(screen.queryByText(/оценить не удалось/i)).not.toBeInTheDocument();
    });

    it('на упавшей джобе объясняет, что вопрос не оценён, и даёт перезапустить', () => {
        const onRetry = jest.fn();
        render(<MockInterviewEvaluationBlock evaluation={null} evaluateStatus={'error'} interviewId={1000} onRetry={onRetry}/>);
        expect(screen.getByText('Этот вопрос оценить не удалось')).toBeInTheDocument();
        // "Ошибка оценки" 36-м кеглем больше не показываем - только спокойный текст
        expect(screen.queryByText('Ошибка оценки')).not.toBeInTheDocument();
        fireEvent.click(screen.getByText('Оценить ещё раз'));
        expect(onRetry).toHaveBeenCalled();
    });

    it('пока оценка не пришла - показывает ожидание, а не ошибку', () => {
        render(<MockInterviewEvaluationBlock evaluation={null} evaluateStatus={'pending'} interviewId={1000}/>);
        expect(screen.getByText('Ожидает оценки')).toBeInTheDocument();
    });
});
