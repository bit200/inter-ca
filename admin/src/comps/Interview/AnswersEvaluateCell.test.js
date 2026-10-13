import React from 'react';
import {render, screen} from '@testing-library/react';
import AnswersEvaluateCell from './AnswersEvaluateCell';

const text = (item) => {
    render(<AnswersEvaluateCell item={item}/>);
    return screen.getByTestId('answers-evaluate-cell').textContent;
};

describe('ячейка «Оценка» в списке интервью', () => {
    it('оценка готова, когда очередь дошла до done', () => {
        expect(text({answersEvaluateState: {status: 'done'}})).toBe('Готова');
    });
    it('пока очередь работает — «Оценивается»', () => {
        expect(text({answersEvaluateState: {status: 'classifying'}})).toBe('Оценивается');
    });
    it('ошибка очереди показывается отдельно', () => {
        expect(text({answersEvaluateState: {status: 'error'}})).toBe('Ошибка');
    });
    it('оценку не запускали — «Не оценено»', () => {
        expect(text({})).toBe('Не оценено');
    });
});
