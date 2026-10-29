import {createTypingTracker} from './typingTracker';

describe('createTypingTracker: история набора кодовой задачи', () => {
    function make() {
        let t = 1000;
        const post = jest.fn(() => Promise.resolve());
        const timers = [];
        const tracker = createTypingTracker({
            post, now: () => t,
            setTimer: fn => { timers.push(fn); return timers.length; },
            clearTimer: () => {},
        });
        return {tracker, post, timers, tick: ms => { t += ms; }};
    }

    test('без набора typingHash не отдаётся', () => {
        const {tracker, post} = make();
        expect(tracker.getHash()).toBeUndefined();
        expect(post).not.toHaveBeenCalled();
    });

    test('набранный код уходит снимком с временем, hash отдаётся для /run-question', () => {
        const {tracker, post, tick} = make();
        tick(5000);
        tracker.change('let a', 0);
        expect(tracker.getHash()).toBe(tracker.hash);
        expect(post).toHaveBeenCalledWith({hash: tracker.hash, data: {code: 'let a', activeFileInd: '0', time: 5}});
    });

    test('частые правки склеиваются в один снимок с последним кодом', () => {
        const {tracker, post, timers} = make();
        tracker.change('a'); tracker.change('ab'); tracker.change('abc');
        expect(timers).toHaveLength(1);
        timers[0]();
        expect(post).toHaveBeenCalledTimes(1);
        expect(post.mock.calls[0][0].data.code).toBe('abc');
    });
});
