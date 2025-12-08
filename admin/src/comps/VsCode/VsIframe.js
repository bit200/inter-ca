import React, {useMemo, useState, useEffect, useRef} from 'react';
import axios from "axios";


let loaded_frames = {}

function getHostFromUrl(url) {
    const a = document.createElement('a');
    a.href = url;

    return a.protocol + '//' + a.host; // Returns "www.example.com:8080"
}

window.addEventListener("message", (event) => {
    let {data} = event;
    console.log("qqqq before everything, HOST LOADED", event);

    if (data.data == 'iframe_loaded') {
        let host = getHostFromUrl(data.url)
        loaded_frames[host] = {cd: new Date().getTime()}
    }
});

function is_null(url) {
    return (url || '').indexOf('undefined?') > -1
}


const VsIframe = ({url, session}) => {
    const [retryCount, setRetryCount] = useState(0);
    const [hasError, setHasError] = useState(false);
    const [realUrl, setRealUrl] = useState('')
    const [loading, setLoading] = useState(true)

    let url_ref = useRef('')
    url_ref.current = url;

    const MAX_ATTEMPTS = 5;
    const TIMEOUT = 500;

    useEffect(() => {
        // Reset retry count when URL changes
        if (!url || is_null(url)) {
            setRealUrl(url)
            setLoading(true)
            return;
        }
        console.log("qqqqq uuuuuuuuuuuuuuuuuuuuuuuuuuuuuu", url);
        setRealUrl(url)

        // function go(attempts) {
        //     console.log("qqqqq is ok url return", is_ok_url(url));
        //     if (!is_ok_url(url)) {
        //         return;
        //     }
        //     is_loaded(url, () => {
        //         console.log("qqqqq real url", );
        //         setLoading(false)
        //         setRealUrl(url)
        //     }, () => {
        //         console.log("qqqqq real url", );
        //         setTimeout(() => go(attempts +1), TIMEOUT)
        //     })
        // }
        //
        // go(0);

        // setRetryCount(0);
        // setHasError(false);
        //
        // // setTimeout(() => {
        // //
        // // }, START_TIMEOUT)
        // delete loaded_frames[url]
        // let host = getHostFromUrl(url)
        // console.log("qqqqq before everything, ",{url, host} );
        // host_ref.current = host;
        // onWatch(0, host, url)
        // setRealUrl(url_ref?.current)
        // setLoading(true)

    }, [url]);

    function is_loaded(url, scb, ecb) {
        let host = getHostFromUrl(url)
        console.log("qqqqq url is_loaded!!!", url, host);
        fetch(host + '/version').then(r => {
            scb()
        }).catch(e => {
            ecb()
        })


    }


    function is_ok_url(url) {
        return url_ref?.current == url
    }


    // let timeout_attempts = [2000, 2000, 3000, 3000, 5000]
    // function onWatch(attempts, host, _url) {
    //     let time = timeout_attempts[attempts] ||  (2000 + attempts * 1000);
    //     console.log("qqqqq before everything, qqqqq on WATCH", {attempts, host, _url, time});
    //     axios.get(session?.server_http + '/update_session_status', {params: {
    //             session_id: session?.session_id,
    //             status: 'on_watch'}}).then((r) => {
    //         console.log("qqqqq rrrrr SErVEr SENDEr", r);
    //     })
    //     setTimeout(() => {
    //         console.log("qqqqq before everything, BEFORE. (aftr TIMEOUT)", loaded_frames, host, attempts, MAX_ATTEMPTS);
    //
    //         if (!loaded_frames[host] && ++attempts < MAX_ATTEMPTS) {
    //             let isOk = is_ok_url(_url);
    //             console.log("qqqqq before everything, qqqqq on reload",{isOk}, attempts, host, loaded_frames, _url, url_ref?.current);
    //
    //             if (!isOk) {
    //                 return;
    //             }
    //             setRetryCount(attempts)
    //             onWatch(attempts, host, _url)
    //         } else {
    //             setLoading(false)
    //             axios.get(session?.server_http + '/update_session_status', {params: {
    //                     session_id: session?.session_id,
    //                     status: 'complete on_watch'}}).then((r) => {
    //                 console.log("qqqqq rrrrr SErVEr SENDEr", r);
    //             })
    //         }
    //     }, time)
    // }
    //


    const memoizedIframe = useMemo(() => {

        let fix_url = retryCount ? `${realUrl}&retry=${retryCount}` : realUrl;
        let is_bad = is_null(fix_url);
        console.log("qqqqq before everything, qqqqq on Fix url", {is_bad}, fix_url, url);


        if (is_bad) {
            return <>{t('Loading')}</>
        }

        // if (!loaded_frames[host_ref.current]) {
        //     return <>{t('Loading')} IDE редактора</>
        // }

        return (<>
                {/*{loading && <div className={'ide-wrapper'}>*/}
                {/*    Загрузка IDE редактора*/}
                {/*</div>}*/}
                <iframe
                    data-frame-session-id={session?.session_id}
                    className={'anim'}
                    style={{animationDelay: '.4s'}}
                    id={'vscode-iframe'}
                    src={fix_url}
                    allowFullScreen
                    allow="clipboard-read; clipboard-write"
                    sandbox="allow-same-origin allow-scripts allow-modals allow-forms allow-popups allow-presentation"
                    key={`${realUrl}-${retryCount}`} // Force re-render with new key
                />
            </>
        );
    }, [realUrl, retryCount, hasError, loading]);

    return memoizedIframe;
};

export default React.memo(VsIframe);