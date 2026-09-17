import React, {useState} from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import DetailsToggle from './DetailsToggle';

function Host() {
    let [open, setOpen] = useState(false);
    return <>
        <DetailsToggle open={open} onToggle={setOpen}/>
        {open && <div>Общая оценка интервью</div>}
    </>;
}

describe('пункт «Детали» на обзоре интервью', () => {
    it('по умолчанию свёрнут и раскрывается по клику', () => {
        render(<Host/>);
        let btn = screen.getByRole('button', {name: /Детали/});
        expect(btn).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByText('Общая оценка интервью')).toBeNull();
        fireEvent.click(btn);
        expect(btn).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByText('Общая оценка интервью')).toBeInTheDocument();
    });
});
