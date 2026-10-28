import {startAudioStream, sendAudioChunk, stopAudioStream} from './audioStream';

describe('audioStream: чанки до открытия сокета', () => {
    let sockets;

    beforeEach(() => {
        sockets = [];
        global.env = {WS_DOMAIN: 'http://ws.test'};
        global.WebSocket = function FakeWebSocket() {
            this.readyState = 0;
            this.sent = [];
            this.send = (m) => this.sent.push(m);
            sockets.push(this);
        };
        global.WebSocket.CONNECTING = 0;
        global.WebSocket.OPEN = 1;
    });

    it('не теряет первый чанк с заголовком, пришедший до onopen', () => {
        startAudioStream({audioHash: 'h', userId: 1, token: 't'});
        const ws = sockets[0];
        sendAudioChunk('header-chunk');
        sendAudioChunk('second-chunk');
        ws.readyState = 1;
        ws.onopen();

        expect(JSON.parse(ws.sent[0]).type).toBe('start');
        expect(ws.sent.slice(1)).toEqual(['header-chunk', 'second-chunk']);
    });

    it('stop, нажатый до onopen, уходит после чанков', () => {
        startAudioStream({audioHash: 'h', userId: 1, token: 't'});
        const ws = sockets[0];
        sendAudioChunk('only-chunk');
        stopAudioStream();
        ws.readyState = 1;
        ws.onopen();

        expect(ws.sent[1]).toBe('only-chunk');
        expect(JSON.parse(ws.sent[2]).type).toBe('stop');
    });

    it('чанки после открытия идут сразу', () => {
        startAudioStream({audioHash: 'h', userId: 1, token: 't'});
        const ws = sockets[0];
        ws.readyState = 1;
        ws.onopen();
        sendAudioChunk('live');
        expect(ws.sent[1]).toBe('live');
    });
});
