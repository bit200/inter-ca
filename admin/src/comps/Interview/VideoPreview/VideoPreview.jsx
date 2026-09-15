import React, {useEffect, useRef, useState} from 'react';
import {linkHost, readVideoSource} from './videoSource';
import './VideoPreview.css';

// Превью записи над вопросами интервью. Плеер показываем, только когда его
// есть чем наполнить; иначе - спокойная плашка с тем, что случилось и куда идти.
export default function VideoPreview({src, time, id}) {
    let source = readVideoSource(src);
    let video = useRef();
    let [failed, setFailed] = useState(false);

    useEffect(() => {
        setFailed(false);
    }, [src]);

    useEffect(() => {
        let el = video.current;
        if (!el || !time) return;
        el.currentTime = +(time.minutes || 0) * 60 + +(time.seconds || 0);
        let playing = el.play && el.play();
        playing && playing.catch && playing.catch(() => {});
    }, [time]);

    if (!source) {
        return <VideoNotice
            title={t('videoNotUploaded')}
            text="Добавьте ссылку на видеофайл в карточке интервью, и запись появится здесь."
        />;
    }

    if (source.kind === 'page') {
        return <VideoNotice
            title="Запись нельзя посмотреть здесь"
            text={`Ссылка ведёт на страницу ${source.place}, а не на видеофайл, поэтому встроенный плеер её не проиграет.`}
            href={source.src}
            action={`Открыть ${source.place}`}
        />;
    }

    if (failed) {
        let host = linkHost(source.src);
        return <VideoNotice
            title="Видео не загрузилось"
            text={`Файл по ссылке${host ? ' с ' + host : ''} недоступен или браузер не умеет его проигрывать.`}
            href={source.src}
            action="Открыть ссылку"
        />;
    }

    return <video
        ref={video}
        controls
        preload="metadata"
        className="videoPreview"
        src={source.src}
        width="100%"
        id={id}
        onError={() => setFailed(true)}
    />;
}

function VideoNotice({title, text, href, action}) {
    return <div className="videoNotice" role="note">
        <div className="videoNoticeIcon iconoir-video-camera-off" aria-hidden="true"></div>
        <div className="videoNoticeBody">
            <div className="videoNoticeTitle">{title}</div>
            <div className="videoNoticeText">{text}</div>
        </div>
        {href && <a className="videoNoticeAction" href={href} target="_blank" rel="noopener noreferrer">{action}</a>}
    </div>;
}
