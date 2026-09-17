import reloadOnFailedHotUpdate from './reloadOnFailedHotUpdate';

const makeHot = () => {
    const handlers = [];
    return {
        addStatusHandler: h => handlers.push(h),
        removeStatusHandler: h => handlers.splice(handlers.indexOf(h), 1),
        emit: status => handlers.slice().forEach(h => h(status)),
        handlers,
    };
};

describe('перезагрузка страницы при сорванном горячем обновлении', () => {
    it('перезагружает один раз, когда HMR ушёл в abort/fail', () => {
        const hot = makeHot();
        const reload = jest.fn();
        reloadOnFailedHotUpdate(hot, reload);
        hot.emit('check');
        hot.emit('apply');
        hot.emit('idle');
        expect(reload).not.toHaveBeenCalled();
        hot.emit('fail');
        hot.emit('abort');
        expect(reload).toHaveBeenCalledTimes(1);
    });

    it('перезагружает и на abort', () => {
        const hot = makeHot();
        const reload = jest.fn();
        reloadOnFailedHotUpdate(hot, reload);
        hot.emit('abort');
        expect(reload).toHaveBeenCalledTimes(1);
    });

    it('без module.hot (прод) ничего не делает, dispose снимает обработчик', () => {
        expect(() => reloadOnFailedHotUpdate(undefined)()).not.toThrow();
        const hot = makeHot();
        const reload = jest.fn();
        const dispose = reloadOnFailedHotUpdate(hot, reload);
        dispose();
        hot.emit('fail');
        expect(reload).not.toHaveBeenCalled();
    });
});
