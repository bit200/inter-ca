import React from 'react';
import { render, screen } from '@testing-library/react';
import MockInterviewName from './MockInterviewName';

describe('MockInterviewName', () => {
    it('показывает название попытки', () => {
        render(<MockInterviewName item={{ name: 'Персональное интервью от 10 сентября 2026 г.' }}/>);
        expect(screen.getByText('Персональное интервью от 10 сентября 2026 г.')).toBeInTheDocument();
    });

    it('без названия не оставляет ячейку пустой', () => {
        render(<MockInterviewName item={{ interviewId: 'p1' }}/>);
        expect(screen.getByText('Мок-интервью')).toBeInTheDocument();
    });
});
