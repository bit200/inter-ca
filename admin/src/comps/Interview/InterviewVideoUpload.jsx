import React, {useEffect, useRef, useState} from 'react';
import Perc from '../Suggest/Perc';
import {startVideoProcess, buildJobAttachInfo, uploadVideoState, uploadErrorMessage, reportUploadEvent} from '../videoProcessUpload';
import {isFileDrag, pickDroppedFile, shouldShowVideoDropzone} from '../videoDropzone';

// Загрузка записи прямо с карточки интервью (вкладка «Обзор»), вместо
// отдельной несвязанной страницы /video: кандидат раньше грузил файл вслепую
// и получал presigned-ссылку, которая ничего не значила для конкретного
// интервью - привязку (Interview.videoUpload) ментору приходилось искать
// руками в списке всех загруженных записей. Здесь загрузка сама создаёт
// UploadVideo и сразу привязывает его к этому интервью одним запросом
// (POST /my-interview/:id/video-upload, controllers/interviewVideoUpload.js).
//
// Файл, как и раньше, идёт напрямую в multer (VIDEO_DOMAIN) - через API
// байты не гонит никто, это осталось как было в comps/UploadVideo.js.
// Держать страницу открытой нужно только пока идут байты: как только multer
// принял файл, запись привязывается к интервью со статусом processing, а
// сжатие и запуск оценки доводит бэк сам. Пока запись processing, карточка
// перечитывает её раз в PROCESSING_POLL_MS.
//
// videoUploadId - item.videoUpload (число, id записи UploadVideo) или пусто,
// если видео ещё не загружено. Interview.videoUpload - не mongoose ref
// (обычное число), поэтому карточка интервью его не populate'ит - детали
// (имя файла, длительность) подтягиваются здесь отдельным запросом.
// onDone(uploadedInterview) - патч интервью с новым videoUpload.
// videoLink - item.video, ссылка на запись; есть ссылка - дропзону не показываем.
const PROCESSING_POLL_MS = 15000;

export default function InterviewVideoUpload({interviewId, videoUploadId, videoLink, onDone}) {
    let [file, setFile] = useState(null);
    let [progress, setProgress] = useState(0);
    let [stage, setStage] = useState('');
    let [err, setErr] = useState('');
    let [dragOver, setDragOver] = useState(false);
    let [uploaded, setUploaded] = useState(null);
    // Запись только что привязана - бэк уже поставил её на разбор сам
    // (services/interviewAutoPipeline.js), говорим, где ждать результат.
    let [justUploaded, setJustUploaded] = useState(false);
    // Последняя четверть прогресса, ушедшая в журнал: пишем 25/50/75%, а не каждый onprogress.
    let reportedQuarter = useRef(0);

    useEffect(() => {
        if (!videoUploadId) return setUploaded(null);
        global.http.get(`/my-upload-video/${videoUploadId}`, {}, {wo_notify: true})
            .then(r => setUploaded((r && r.data) || null))
            .catch(() => {});
    }, [videoUploadId]);

    let uploadedState = uploadVideoState(uploaded);
    useEffect(() => {
        if (!uploaded || !uploaded._id || uploadedState !== 'processing') return;
        let timer = setTimeout(() => {
            global.http.get(`/my-upload-video/${uploaded._id}`, {}, {wo_notify: true})
                .then(r => r && r.data && setUploaded(r.data))
                .catch(() => setUploaded({...uploaded}));
        }, PROCESSING_POLL_MS);
        return () => clearTimeout(timer);
    }, [uploaded, uploadedState]);

    let getDuration = (file, cb) => {
        let video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
            window.URL.revokeObjectURL(video.src);
            cb && cb(+(video.duration / 60).toFixed(1));
        };
        video.onerror = () => cb && cb(0);
        video.src = URL.createObjectURL(file);
    };

    let onChange = (picked) => {
        let fileSize = picked.size;
        let originalFileName = picked.name;

        setFile(picked);
        setProgress(0);
        setStage('');
        setErr('');

        getDuration(picked, async (duration) => {
            let report = (event) => reportUploadEvent({interviewId, name: originalFileName, ...event});
            if (fileSize > 500 * 1000 * 1000) {
                setFile(null);
                report({event: 'failed', fileSize, error: t('tooBig')});
                return setErr(t('tooBig'));
            }
            if (!duration) {
                setFile(null);
                report({event: 'failed', fileSize, error: t('errIncorrect')});
                return setErr(t('errIncorrect'));
            }

            let domain = global.env.VIDEO_DOMAIN;
            let token = user.get_token();
            reportedQuarter.current = 0;
            try {
                setStage('upload');
                report({event: 'started', fileSize, duration});
                let started = await startVideoProcess({
                    domain, token, file: picked,
                    user: user.get_id(),
                    onUploadProgress: (percent) => {
                        setProgress(percent);
                        let quarter = Math.floor(percent / 25) * 25;
                        if (quarter > reportedQuarter.current && quarter < 100) {
                            reportedQuarter.current = quarter;
                            report({event: 'progress', percent: quarter});
                        }
                    },
                });
                setProgress(100);
                report({event: 'sent', jobId: started.id});

                let res = await global.http.post(`/my-interview/${interviewId}/video-upload`,
                    buildJobAttachInfo({jobId: started.id, name: originalFileName, duration}));
                setUploaded((res && res.uploadVideo) || null);
                setJustUploaded(true);
                setStage('');
                onDone && onDone(res && res.item);
            } catch (e) {
                setStage('error');
                setErr(uploadErrorMessage(e));
                report({event: 'failed', error: uploadErrorMessage(e)});
            }
        });
    };

    if (uploaded && uploaded._id && stage !== 'upload') {
        let info = uploaded.info || {};
        return <div className="interviewVideoUpload">
            {uploadedState === 'processing' && <>
                Файл загружен, сервер сжимает видео. Это займёт несколько минут — страницу можно закрыть,
                оценка запустится сама
                <div className="progress" style={{height: '3px'}}>
                    <div className="progress-bar progress-bar-striped progress-bar-animated" style={{width: '100%'}}/>
                </div>
            </>}
            {uploadedState === 'error' && <div className="text-danger">
                Не удалось обработать видео{info.error ? `: ${info.error}` : ''}. Загрузите запись ещё раз
            </div>}
            {uploadedState === 'done' && <div className="text-success">
                <i className="iconoir-check-circle" style={{marginRight: '5px'}}></i>
                {info.name || `Запись #${uploaded._id}`}
                {info.duration ? ` · ${(+info.duration).toFixed(0)} мин` : ''}
            </div>}
            {justUploaded && uploadedState === 'done' && <div className="text-muted">
                Оценка запустилась сама: разбор диалога, оценка ответов и мок-интервью по слабым
                местам появятся во вкладке «Разбор диалога».
            </div>}
            <button type="button" className="btn btn-xs btn-default" onClick={() => {
                setUploaded(null);
                setJustUploaded(false);
                setFile(null);
            }}>Заменить запись</button>
        </div>;
    }

    if (!stage && !shouldShowVideoDropzone({stage, videoLink})) return null;

    return <div className="interviewVideoUpload">
        {stage === 'upload' && <>
            Загрузка файла: {progress}%. Не закрывайте страницу, пока файл не загрузится
            <Perc value={progress} height={3}/>
        </>}
        {stage === 'error' && <div className="text-danger">Не удалось загрузить видео: {err}. Выберите файл ещё раз</div>}

        {shouldShowVideoDropzone({stage, videoLink}) && <div
            role="button"
            tabIndex={0}
            className={'videoDropzone' + (dragOver ? ' dragOver' : '')}
            onClick={() => $('#interviewVideoUploadInput').click()}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    $('#interviewVideoUploadInput').click();
                }
            }}
            onDragEnter={(e) => {
                if (!isFileDrag(e.dataTransfer)) return;
                e.preventDefault();
                setDragOver(true);
            }}
            onDragOver={(e) => {
                if (!isFileDrag(e.dataTransfer)) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                let dropped = pickDroppedFile(e.dataTransfer);
                if (!dropped) {
                    return window.notify?.error('Перетащите видеофайл: mp4, mov, webm или другой формат видео');
                }
                onChange(dropped);
            }}
        >
            <i className="iconoir-upload videoDropzoneIcon"></i>
            <div className="videoDropzoneTitle">{dragOver ? 'Отпустите, чтобы загрузить' : 'Загрузите запись интервью'}</div>
            {!dragOver && <div className="videoDropzoneHint">или перетащите видео сюда</div>}
        </div>}

        <div style={{display: 'none'}}>
            <input id="interviewVideoUploadInput" type="file" accept="video/*" onChange={(e) => {
                let picked = e.target.files[0];
                picked && onChange(picked);
            }}/>
        </div>
    </div>;
}
