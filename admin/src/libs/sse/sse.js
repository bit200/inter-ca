import user from '../user/user';

// Thin Server-Sent Events adapter, mirrors how libs/http talks to the API (same
// domain/prefix, same token) so any feature can subscribe to a live channel without
// hand-rolling EventSource + auth + cleanup again.
//
// EventSource can't send custom headers, so the token goes in the query string
// instead of the Authorization header libs/http uses - same token, different transport.
//
// Reconnection on drop is native EventSource behavior, no extra code needed here.
function subscribe(path, onMessage) {
    const token = user.get_token();
    const sep = path.includes('?') ? '&' : '?';
    const url = `${window.env.domain}/api${path}${sep}token=${encodeURIComponent(token)}`;

    const source = new EventSource(url);
    source.onmessage = e => {
        try {
            onMessage(JSON.parse(e.data));
        } catch (err) {
            // malformed frame - ignore, next one will still come through
        }
    };

    return () => source.close();
}

const sse = { subscribe };

export default sse;
