import React from 'react';
import {render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import RolesPendingInterviews from './RolesPendingInterviews';

const renderWith = (items) => {
    global.http = {get: jest.fn(() => Promise.resolve({items}))};
    return render(<MemoryRouter><RolesPendingInterviews/></MemoryRouter>);
};

describe('уведомление об интервью, где оценка ждёт разметки ролей', () => {
    it('ведёт на вкладку разбора каждого такого интервью', async () => {
        renderWith([{_id: 1000, name: 'Тех интервью в Яндекс'}, {_id: 1001}]);
        let links = await screen.findAllByTestId('roles-pending-interview-link');
        expect(links.map(link => link.getAttribute('href'))).toEqual(['/interviews/1000?tab=dialog', '/interviews/1001?tab=dialog']);
        expect(screen.getByText('Оценка 2 интервью ждёт вас')).toBeInTheDocument();
        expect(global.http.get).toHaveBeenCalledWith('/my-interview-roles-pending', {}, {wo_notify: true});
    });

    it('нечего размечать — уведомления нет', async () => {
        let {container} = renderWith([]);
        await Promise.resolve();
        expect(container.firstChild).toBeNull();
    });
});
