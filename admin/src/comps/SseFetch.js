/**
 * Serialize query params
 * @param {object|string} query
 */
function buildQueryString(query) {
    if (!query) return '';
    if (typeof query === 'string') return query.startsWith('?') ? query : `?${query}`;
    const q = Object.entries(query)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
    return q ? `?${q}` : '';
}

/**
 * sseFetch - Helper for subscribing to SSE endpoint
 * @param {string} url - SSE endpoint
 * @param {function} temp_cb - called on each incoming message
 * @param {function} final_cb - called on error/close (final event)
 * @param {object|string} [query] - query params (object or string)
 * @returns {function} cleanup - call to close the connection manually
 */
export function sseFetch({url, query, on_msg,
                             on_response, on_complete}) {
    const urlWithQuery = url + buildQueryString(query);

    const eventSource = new EventSource(urlWithQuery);

    eventSource.onmessage = (event) => {
        console.log("qqqqq on messge", event);
        try {
            let v = JSON.parse(event.data);
            if (v.name == 'response') {
                on_complete && on_complete({message: 'auto_complete', _data: v});
                on_response && on_response({message: 'auto_complete', _data: v});
            }
            on_msg(v);
        } catch (err) {
            // Optionally handle parse errors
        }
    };

    eventSource.onerror = () => {
        on_complete && on_complete({ message: 'Connection finished', timestamp: new Date().toISOString() });
        eventSource.close();
    };

    return () => {
        on_complete && on_complete({ message: 'Connection closed by client', timestamp: new Date().toISOString() });
        eventSource.close();
    };
}
