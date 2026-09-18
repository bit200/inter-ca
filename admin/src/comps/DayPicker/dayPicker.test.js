import React, {useState} from 'react';
import fs from 'fs';
import path from 'path';
import {render, screen, fireEvent} from '@testing-library/react';
import DateField from '../../libs/Smart/DateField';
import {mergeDayIntoValue} from './dayPickerValue';
import {dayLabel} from './dayPickerModel';

global.t = global.t || (s => s);

function Host({initial}) {
    let [value, setValue] = useState(initial);
    return <>
        <DateField field={{name: 'date'}} label={'date'} value={value} onChange={setValue}/>
        <output data-testid={'val'}>{String(value)}</output>
    </>;
}

describe('поле даты Smart-формы', () => {
    it('type: date рендерится селектором дня, а не голым react-datepicker', () => {
        const smart = fs.readFileSync(path.join(__dirname, '../../libs/Smart/Smart.js'), 'utf8');
        expect(smart).toMatch(/\/date\/gi\.test\(type\)\s*&&\s*<DateField/);
        expect(smart).not.toMatch(/^import DatePicker from/m);
    });

    it('показывает дату словами и выбирает день в календаре', () => {
        render(<Host initial={'2026-09-10'}/>);
        const control = screen.getByRole('button', {name: 'date'});
        expect(control).toHaveTextContent(dayLabel('2026-09-10'));
        fireEvent.click(control);
        fireEvent.click(screen.getByRole('button', {name: '15', pressed: false}));
        expect(screen.getByTestId('val')).toHaveTextContent('2026-09-15');
    });

    it('в узкой колонке формы боковых стрелок нет, крестик убирает дату', () => {
        render(<Host initial={'2026-09-10'}/>);
        expect(screen.queryByRole('button', {name: 'Следующий день'})).toBeNull();
        fireEvent.click(screen.getByRole('button', {name: 'Убрать дату'}));
        expect(screen.getByTestId('val')).toHaveTextContent('null');
    });
});

describe('модули селектора дня', () => {
    it('экспортируют функции через export — иначе прод-сборка не находит импорт', () => {
        for (const name of ['dayPickerValue.js', 'dayPickerPlace.js']) {
            const src = fs.readFileSync(path.join(__dirname, name), 'utf8');
            expect(src).not.toMatch(/module\.exports/);
            expect(src).toMatch(/^export /m);
        }
    });
});

describe('значение выбранного дня', () => {
    it('у голой даты остаётся YYYY-MM-DD, у даты со временем живут часы', () => {
        expect(mergeDayIntoValue('2026-08-01', '2026-08-07')).toBe('2026-08-07');
        const prev = new Date(2026, 7, 1, 14, 35, 0);
        const next = new Date(mergeDayIntoValue(prev.toISOString(), '2026-08-07'));
        expect([next.getDate(), next.getHours(), next.getMinutes()]).toEqual([7, 14, 35]);
    });
});
