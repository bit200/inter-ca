import React from 'react';
import {render, screen, act} from '@testing-library/react';
import MockInterviewIframe from './MockInterviewIframe';

const EMBED_ORIGIN = 'https://interview.infrastruct.ru';

const interview = {
    _id: 'a1',
    name: 'Интервью тест',
    embedUrl: `${EMBED_ORIGIN}/embed/interview?launch_code=x`,
};

// postMessage в jsdom не проставляет origin, поэтому шлём событие руками -
// компонент сверяет e.origin с origin'ом самого embedUrl.
function emit(type, payload) {
    act(() => {
        window.dispatchEvent(new MessageEvent('message', {
            origin: EMBED_ORIGIN,
            data: {source: 'itk-live-embed', type, payload},
        }));
    });
}

function setup() {
    const onClose = jest.fn();
    const onComplete = jest.fn();
    render(<MockInterviewIframe interview={interview} onClose={onClose} onComplete={onComplete} />);
    return {onClose, onComplete};
}

describe('MockInterviewIframe', () => {
    it('над iframe нет своей шапки - ни названия интервью, ни кнопки выхода', () => {
        setup();
        expect(screen.queryByText('Интервью тест')).toBeNull();
        expect(screen.queryByRole('button', {name: 'Выйти'})).toBeNull();
        expect(screen.queryByTestId('mock-interview-exit-btn')).toBeNull();
    });

    it('iframe - единственное содержимое оверлея, поэтому занимает весь экран', () => {
        setup();
        const overlay = screen.getByTestId('mock-interview-overlay');
        const frame = screen.getByTestId('mock-interview-embed-frame');
        expect(overlay.children).toHaveLength(1);
        expect(overlay.contains(frame)).toBe(true);
    });

    it('выход из iframe, пока ждём прощальную реплику бота, завершает попытку сразу', () => {
        const {onClose, onComplete} = setup();

        // бот ещё говорит -> завершение откладывается до конца проигрывания
        emit('itk.interview.state', {aiPlaying: true});
        emit('itk.interview.session_closed', {status: 'completed'});
        expect(onComplete).not.toHaveBeenCalled();

        // пользователь не стал дослушивать и нажал "Выйти" внутри itk-live
        emit('itk.interview.session_closed', {status: 'cancelled'});
        expect(onComplete).toHaveBeenCalledTimes(1);
        expect(onClose).not.toHaveBeenCalled();
    });

    it('обычное закрытие сессии не-completed статусом по-прежнему просто закрывает оверлей', () => {
        const {onClose, onComplete} = setup();
        emit('itk.interview.session_closed', {status: 'cancelled'});
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(onComplete).not.toHaveBeenCalled();
    });

    it('кнопка "Выйти" внутри iframe (itk.interview.exit) закрывает оверлей', () => {
        const {onClose, onComplete} = setup();
        emit('itk.interview.exit', {});
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(onComplete).not.toHaveBeenCalled();
    });

    it('itk.interview.exit, пока ждём прощальную реплику бота, завершает попытку сразу', () => {
        const {onClose, onComplete} = setup();

        emit('itk.interview.state', {aiPlaying: true});
        emit('itk.interview.session_closed', {status: 'completed'});
        expect(onComplete).not.toHaveBeenCalled();

        emit('itk.interview.exit', {});
        expect(onComplete).toHaveBeenCalledTimes(1);
        expect(onClose).not.toHaveBeenCalled();
    });

    it('session_closed со статусом closed завершает попытку, а не просто закрывает оверлей', () => {
        const {onClose, onComplete} = setup();
        emit('itk.interview.session_closed', {status: 'closed'});
        expect(onComplete).toHaveBeenCalledTimes(1);
        expect(onClose).not.toHaveBeenCalled();
    });

    it('itk.interview.exit после отвеченных вопросов завершает попытку', () => {
        const {onClose, onComplete} = setup();
        emit('itk.interview.state', {aiPlaying: false, turns: 13});
        emit('itk.interview.exit', {});
        expect(onComplete).toHaveBeenCalledTimes(1);
        expect(onClose).not.toHaveBeenCalled();
    });

    it('itk.interview.exit и следом session_closed закрывают оверлей один раз', () => {
        const {onClose, onComplete} = setup();
        emit('itk.interview.exit', {});
        emit('itk.interview.session_closed', {status: 'cancelled'});
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(onComplete).not.toHaveBeenCalled();
    });
});
