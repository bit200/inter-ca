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
