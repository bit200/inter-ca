import {useEffect, useState} from 'react';
import {fetchVideoPreview} from '../videoProcessUpload';

// Ссылка на сжатую копию загруженной записи для плеера (см. fetchVideoPreview).
// ready=false - запрашивать нечего: записи нет, она ещё сжимается или у
// интервью уже есть своя ссылка на видео.
export default function useVideoPreview({interviewId, videoUploadId, ready = true}) {
    let [url, setUrl] = useState('');
    useEffect(() => {
        setUrl('');
        if (!interviewId || !videoUploadId || !ready) return;
        let alive = true;
        fetchVideoPreview({interviewId}).then(value => alive && setUrl(value));
        return () => {
            alive = false;
        };
    }, [interviewId, videoUploadId, ready]);
    return url;
}
