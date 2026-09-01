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

    it('когда аудио ответа потеряно - предлагает оценку по тексту', () => {
        const onRetry = jest.fn();
        render(<MockInterviewEvaluationBlock evaluation={null} evaluateStatus={'error'} interviewId={1000} audioLost={true} onRetry={onRetry}/>);
        expect(screen.getByText('Запись ответа не сохранилась')).toBeInTheDocument();
        expect(screen.queryByText('Оценить ещё раз')).not.toBeInTheDocument();
        fireEvent.click(screen.getByText('Оценить по тексту'));
        expect(onRetry).toHaveBeenCalled();
    });

    it('оценку, посчитанную по тексту, помечает как оценку без аудио-метрик', () => {
        render(<MockInterviewEvaluationBlock evaluation={{ score: 6, textOnly: true }} evaluateStatus={'done'} interviewId={1000}/>);
        expect(screen.getByText(/Оценка по тексту ответа/)).toBeInTheDocument();
    });

    it('обычную оценку пометкой про текст не пачкает', () => {
        render(<MockInterviewEvaluationBlock evaluation={{ score: 6 }} evaluateStatus={'done'} interviewId={1000}/>);
        expect(screen.queryByText(/Оценка по тексту ответа/)).not.toBeInTheDocument();
    });

    it('пропущенный вопрос называет пропуском и показывает балл 0', () => {
        const onRetry = jest.fn();
        render(<MockInterviewEvaluationBlock
            evaluation={{ score: 0, skipped: true, reason: 'no_answer' }}
            evaluateStatus={'done'}
            interviewId={1000}
            onRetry={onRetry}
        />);
        expect(screen.getByText(/Ответ на этот вопрос пропущен/)).toBeInTheDocument();
        expect(screen.getByText('score:0')).toBeInTheDocument();
        // пропуск - не сбой оценки: ни ошибки, ни кнопки перезапуска тут быть не должно
        expect(screen.queryByText(/оценить не удалось/i)).not.toBeInTheDocument();
        expect(screen.queryByText('Оценить ещё раз')).not.toBeInTheDocument();
        expect(screen.queryByText('advice')).not.toBeInTheDocument();
    });

    it('пока оценка не пришла - показывает ожидание, а не ошибку', () => {
        render(<MockInterviewEvaluationBlock evaluation={null} evaluateStatus={'pending'} interviewId={1000}/>);
        expect(screen.getByText('Ожидает оценки')).toBeInTheDocument();
    });
});
