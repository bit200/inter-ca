import {backTarget} from './backTarget';

describe('куда ведёт «Назад» в карточке', () => {
    test('без backTo - шаг назад по истории с подписью «Вернуться»', () => {
        expect(backTarget({})).toEqual({to: -1, label: 'back'});
        expect(backTarget(undefined)).toEqual({to: -1, label: 'back'});
    });

    test('backTo строкой - всегда на этот адрес', () => {
        expect(backTarget({backTo: '/interviews'})).toEqual({to: '/interviews', label: 'back'});
    });

    test('backTo объектом - адрес и своя подпись', () => {
        expect(backTarget({backTo: {url: '/interviews', label: 'backToInterviews'}}))
            .toEqual({to: '/interviews', label: 'backToInterviews'});
    });
});
