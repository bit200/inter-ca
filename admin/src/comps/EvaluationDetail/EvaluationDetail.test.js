import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import EvaluationDetail from './EvaluationDetail';

jest.mock('../../libs/sse/sse', () => ({ subscribe: () => () => {} }));

const renderPage = (item) => {
    global.http = {
        get: (url) => Promise.resolve(url === '/evaluate-details' ? item : { items: [] }),
        post: () => Promise.resolve({}),
    };
    return render(
        <MemoryRouter initialEntries={['/evaluations/1017']}>
            <Routes>
                <Route path="/evaluations/:id" element={<EvaluationDetail/>}/>
            </Routes>
        </MemoryRouter>
    );
};

describe('EvaluationDetail: ширина контента', () => {
    // Боковые отступы задаёт раскладка (.container-xxl + .mainWrapPadd2) - если
    // страница добавит свои, контент станет уже, чем на дашборде, и переход
    // между экранами будет выглядеть "прыжком".
    it('не задаёт странице собственных боковых отступов', async () => {
        const { container, findByText } = renderPage({
            _id: 1017,
            answerType: 'text',
            evaluate: { status: 'done', result: { question: 'Что такое хуки?', text: 'Ответ', score: 5.7 } },
        });
        await findByText('Что такое хуки?');

        const page = container.firstChild;
        expect(page).toHaveClass('page');
        expect(page.style.paddingLeft).toBe('');
        expect(page.style.paddingRight).toBe('');
        expect(page.style.padding).toBe('');
    });
});

describe('EvaluationDetail: оценка куратора', () => {
    // Куратор ставит свой балл и пишет рекомендацию в админке, и приходят они
    // тем же /evaluate-details, что и машинная оценка. Раньше страница их
    // игнорировала - кандидат видел только балл ИИ.
    it('показывает балл куратора и его рекомендацию рядом с автоматической оценкой', async () => {
        const { findByTestId } = renderPage({
            _id: 1042,
            answerType: 'audio',
            evaluate: { status: 'done', result: { question: 'Что такое замыкание?', text: 'Ответ', score: 5.4 } },
            mentorReview: { score: 8, comment: 'Добавь пример из практики', mentorName: 'Пётр Смирнов' },
        });

        const band = await findByTestId('mentor-review');
        expect(band).toHaveTextContent('Оценка куратора');
        expect(band).toHaveTextContent('Пётр Смирнов');
        expect(band).toHaveTextContent('8');
        expect(band).toHaveTextContent('на 2.6 выше автоматической');
        expect(band).toHaveTextContent('Добавь пример из практики');
    });

    it('без оценки куратора блока на странице нет', async () => {
        const { queryByTestId, findByText } = renderPage({
            _id: 1042,
            answerType: 'text',
            evaluate: { status: 'done', result: { question: 'Что такое замыкание?', text: 'Ответ', score: 5.4 } },
        });
        await findByText('Что такое замыкание?');

        expect(queryByTestId('mentor-review')).toBe(null);
    });
});

describe('EvaluationDetail: кто говорит в блоке "Как прошёл ответ"', () => {
    // Буква в кружке ("В" и "О") читалась как значок с числом: одиночная "О"
    // на экране с баллами воспринималась как ноль. Подписываем словом.
    it('подписывает реплики словами "Вопрос" и "Ответ", а не одной буквой', async () => {
        const { container, findByText } = renderPage({
            _id: 1042,
            answerType: 'text',
            evaluate: {
                status: 'done',
                result: { question: 'Что такое хуки?', text: 'Хуки нужны для состояния', score: 5.7 },
            },
            titleInfo: { title: 'Хуки React' },
        });
        await findByText('Хуки нужны для состояния');

        const who = [...container.querySelectorAll('.turnWho')].map(n => n.textContent);
        expect(who).toEqual(['Вопрос', 'Ответ']);
    });

    it('у одиночного ответа подписи нет, а заголовок карточки - просто "Ответ"', async () => {
        const { container, findByText, queryByText } = renderPage({
            _id: 1042,
            answerType: 'text',
            evaluate: {
                status: 'done',
                result: { question: 'Что такое хуки?', text: 'Хуки нужны для состояния', score: 5.7 },
            },
        });
        await findByText('Хуки нужны для состояния');

        expect(container.querySelectorAll('.turnWho').length).toBe(0);
        expect(queryByText('Как прошёл ответ')).toBe(null);
        expect(queryByText('Ответ')).not.toBe(null);
    });
});
