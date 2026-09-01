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
    it('в шапке оверлея нет своей кнопки выхода - выходят кнопкой самого itk-live внутри iframe', () => {
        setup();
        expect(screen.getByText('Интервью тест')).toBeInTheDocument();
        expect(screen.queryByRole('button', {name: 'Выйти'})).toBeNull();
        expect(screen.queryByTestId('mock-interview-exit-btn')).toBeNull();
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
});
