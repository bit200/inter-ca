import React from 'react';
import { render, screen } from '@testing-library/react';
import ProgressTrack from './ProgressTrack';
import { getTopStatsNew } from './mainMethods';

describe('ProgressTrack - полоса прогресса в шапке дашборда', () => {
    it('закрашивает полосу на долю пройденного', () => {
        const { container } = render(<ProgressTrack value={42} done={62} total={148} unit="топиков"/>);
        expect(container.querySelector('.pbarTrack > i')).toHaveStyle({ width: '42%' });
    });

    it('над полосой всегда видны подпись «Прогресс» и значения', () => {
        const { container } = render(<ProgressTrack value={42} done={62} total={148} unit="топиков"/>);
        const head = container.querySelector('.pbarHead');
        expect(head).toBeInTheDocument();
        expect(head.querySelector('.pbarLabel')).toHaveTextContent('Прогресс');
        expect(head.querySelector('.pbarPerc')).toHaveTextContent('42%');
        expect(head.querySelector('.pbarOf')).toHaveTextContent('62 из 148 топиков');
    });

    it('панель на наведении показывает процент и сколько топиков из скольких', () => {
        render(<ProgressTrack value={42} done={62} total={148} unit="топиков"/>);
        expect(screen.getByText('42')).toBeInTheDocument();
        expect(screen.getByText('62')).toBeInTheDocument();
        expect(screen.getByText('148')).toBeInTheDocument();
        expect(screen.getByText(/Осталось 86 топиков/)).toBeInTheDocument();
    });

    it('на 100 % вместо остатка пишет, что подготовка завершена', () => {
        render(<ProgressTrack value={100} done={148} total={148} unit="топиков"/>);
        expect(screen.getByText(/подготовка завершена/)).toBeInTheDocument();
        expect(screen.queryByText(/Осталось/)).not.toBeInTheDocument();
    });

    it('полоса доступна с клавиатуры и объявляет значение', () => {
        const { container } = render(<ProgressTrack value={42} done={62} total={148} unit="топиков"/>);
        const bar = container.querySelector('.pbar');
        expect(bar).toHaveAttribute('tabindex', '0');
        expect(bar).toHaveAttribute('aria-valuenow', '42');
    });
});

// underscore в проекте глобальный (см. _global.js) - mainMethods зовёт его без импорта
describe('getTopStatsNew', () => {
    beforeAll(() => { global._ = require('underscore'); });

    it('отдаёт число пройденных топиков - панели нужно «62 из 148»', () => {
        const res = {
            userCourses: [
                { modules: [1, 2], qHistory: { a: 1, b: 1 } },
                { modules: [3], qHistory: { c: 1 } },
            ],
            questionIds: [1, 2, 3, 4, 5, 6],
        };
        const stats = getTopStatsNew({ res });
        expect(stats.goodQuestions).toBe(3);
        expect(stats.questions).toBe(6);
        expect(stats.perc).toBe(50);
    });
});
