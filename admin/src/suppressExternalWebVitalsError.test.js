import suppressExternalWebVitalsError, {isExternalWebVitalsError} from './suppressExternalWebVitalsError';

describe('подавление ошибки стороннего web-vitals', () => {
    const externalError = () => {
        const error = new TypeError("Cannot read properties of undefined (reading 'startTime')");
        error.stack = "TypeError: Cannot read properties of undefined (reading 'startTime')\n    at et.reportAllChanges (<anonymous>:2:19429)";
        return {message: error.message, filename: '', error};
    };

    it('узнаёт ошибку внешнего скрипта', () => {
        expect(isExternalWebVitalsError(externalError())).toBe(true);
    });

    it('не трогает ошибки нашего бандла', () => {
        expect(isExternalWebVitalsError({
            message: "Cannot read properties of undefined (reading 'startTime')",
            filename: 'http://localhost/static/js/main.js',
            error: new TypeError('x')
        })).toBe(false);
        expect(isExternalWebVitalsError({message: 'Cannot read properties of undefined (reading "answers")'})).toBe(false);
    });

    it('гасит событие error с этой ошибкой и снимает обработчик', () => {
        // отдельный EventTarget вместо window: jsdom сам роняет тест на событии error у окна
        const target = new EventTarget();
        const dispose = suppressExternalWebVitalsError(target);
        const fire = payload => {
            const event = new Event('error', {cancelable: true});
            Object.assign(event, payload);
            target.dispatchEvent(event);
            return event.defaultPrevented;
        };
        expect(fire(externalError())).toBe(true);
        expect(fire({message: 'other boom', error: new Error('other boom')})).toBe(false);
        dispose();
        expect(fire(externalError())).toBe(false);
    });
});
