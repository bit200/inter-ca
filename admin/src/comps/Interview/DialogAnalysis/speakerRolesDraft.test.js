import {draftComplete, draftWithRole, initialDraft, shouldSendRoles} from './speakerRolesDraft';

const two = [{key: 'SPEAKER_00'}, {key: 'SPEAKER_01'}];
const three = [...two, {key: 'SPEAKER_02'}];

describe('разметка ролей, когда их не определили автоматически', () => {
    it('у двух участников второй получает противоположную роль сам', () => {
        expect(draftWithRole(two, {}, 'SPEAKER_01', 'manager')).toEqual({SPEAKER_01: 'manager', SPEAKER_00: 'client'});
        expect(draftWithRole(two, {SPEAKER_01: 'manager', SPEAKER_00: 'client'}, 'SPEAKER_01', 'client'))
            .toEqual({SPEAKER_01: 'client', SPEAKER_00: 'manager'});
    });

    it('у трёх участников каждый размечается отдельно', () => {
        expect(draftWithRole(three, {}, 'SPEAKER_00', 'manager')).toEqual({SPEAKER_00: 'manager'});
    });

    it('продолжить можно, только когда роль у всех и есть обе роли', () => {
        expect(draftComplete(two, {})).toBe(false);
        expect(draftComplete(two, {SPEAKER_00: 'client', SPEAKER_01: 'client'})).toBe(false);
        expect(draftComplete(three, {SPEAKER_00: 'manager', SPEAKER_01: 'client'})).toBe(false);
        expect(draftComplete(two, {SPEAKER_00: 'manager', SPEAKER_01: 'client'})).toBe(true);
    });

    it('черновик берёт прошлые ручные роли и не выдумывает остальные', () => {
        expect(initialDraft(two, {SPEAKER_00: 'client', X: 'manager', SPEAKER_01: 'boss'})).toEqual({SPEAKER_00: 'client'});
    });

    it('роли уходят на бэк, пока оценка их ждёт или когда они только что стали полными', () => {
        expect(shouldSendRoles({rolesPending: true})).toBe(true);
        expect(shouldSendRoles({justCompleted: true})).toBe(true);
        expect(shouldSendRoles({rolesPending: false, justCompleted: false})).toBe(false);
    });
});
