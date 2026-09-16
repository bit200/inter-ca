import React from 'react';
import { render, screen } from '@testing-library/react';
import MockInterviewEvaluationBlock from './MockInterviewEvaluationBlock';

jest.mock('../../EvaluationDetail/components/ScoreBar', () => ({ score }) => <div>score:{score}</div>);
jest.mock('../../EvaluationDetail/components/AdviceSection', () => () => <div>advice</div>);

describe('MockInterviewEvaluationBlock: расшифровка оценки', () => {
    it('при переключении на другой вопрос показывает расшифровку этого вопроса, а не предыдущего', () => {
        const props = { evaluation: { score: 6 }, evaluateStatus: 'done', interviewId: 1011 };
        const { rerender } = render(
            <MockInterviewEvaluationBlock {...props} evaluateId={'e1'} evaluateExplain={{ summary: 'Вывод по первому вопросу' }}/>
        );
        expect(screen.getByText('Вывод по первому вопросу')).toBeInTheDocument();

        rerender(<MockInterviewEvaluationBlock {...props} evaluateId={'e2'} evaluateExplain={{ summary: 'Вывод по второму вопросу' }}/>);
        expect(screen.getByText('Вывод по второму вопросу')).toBeInTheDocument();
        expect(screen.queryByText('Вывод по первому вопросу')).not.toBeInTheDocument();

        rerender(<MockInterviewEvaluationBlock {...props} evaluateId={'e3'} evaluateExplain={null}/>);
        expect(screen.queryByText('Вывод по второму вопросу')).not.toBeInTheDocument();
        expect(screen.getByTestId('evaluate-explain-button')).toBeInTheDocument();
    });
});
