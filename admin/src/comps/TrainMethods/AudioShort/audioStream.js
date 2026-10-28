let socket = null;
let completeResolve = null;
let completePromise = null;
// Сокет открывается дольше 250 мс (TLS + upgrade), а MediaRecorder отдаёт первый
// чанк с заголовком webm уже через 250 мс. Всё, что пришло до onopen, копим тут
// и шлём сразу после 'start', иначе в S3 уходит файл без заголовка.
let pendingChunks = [];
let stopRequested = false;

function getWsUrl() {
    const base = global.env.WS_DOMAIN || global.env.VIDEO_DOMAIN || window.location.origin;
    return base.replace(/^http/, 'ws') + '/audio-stream';
}

export function startAudioStream({ audioHash, userId, token }) {
    completePromise = new Promise(resolve => { completeResolve = resolve; });
    pendingChunks = [];
    stopRequested = false;
    socket = new WebSocket(getWsUrl());

    socket.onopen = () => {
        socket.send(JSON.stringify({ type: 'start', audioHash, userId, token }));
        pendingChunks.forEach(chunk => socket.send(chunk));
        pendingChunks = [];
        if (stopRequested) {
            socket.send(JSON.stringify({ type: 'stop' }));
        }
    };

    socket.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'complete') {
            completeResolve && completeResolve(msg);
        }
        if (msg.type === 'aborted') {
            // сервер подтвердил, что запись в S3 не попала
            completeResolve && completeResolve(null);
        }
    };

    socket.onerror = (err) => {
        console.error('audioStream error', err);
        completeResolve && completeResolve(null);
    };

    socket.onclose = (event) => {
        console.log('audioStream closed', event.code, event.reason);
    };
}

export function sendAudioChunk(chunk) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(chunk);
        return;
    }
    if (socket && socket.readyState === WebSocket.CONNECTING) {
        pendingChunks = [...pendingChunks, chunk];
    }
}

export function stopAudioStream() {
    console.log('stopAudioStream readyState', socket?.readyState, WebSocket.OPEN);
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'stop' }));
    }
    if (socket && socket.readyState === WebSocket.CONNECTING) {
        stopRequested = true;
    }
}

// Отмена уже начатой заливки: чанки на сервер летят по ходу записи, поэтому
// при автостопе по тишине сервер надо явно попросить не класть их в S3.
export function abortAudioStream(reason) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({type: 'abort', reason: reason || 'silence'}));
    }
    completeResolve && completeResolve(null);
}

export function waitForStreamComplete() {
    return completePromise || Promise.resolve(null);
}