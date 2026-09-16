import React, {useState, useEffect, useRef} from 'react';
import Perc from "./Suggest/Perc";
import Input from "../libs/Input";
import Textarea from "../libs/Textarea";
import MyModal from "../libs/MyModal";
import {startVideoProcess, waitVideoProcess, buildS3UploadInfo, uploadErrorMessage} from "./videoProcessUpload";
import {isFileDrag, pickDroppedFile} from "./videoDropzone";

function Layout2(props) {
    //console.log('*........ ## ROOT RENDER', props);

    let [open, setOpen] = useState(false)
    let [comment, setComment] = useState('')
    let [progress, setProgress] = useState(0)
    let [err, setErr] = useState('')
    let [info, setInfo] = useState({})
    let [file, setFile] = useState(null)
    let [video, setVideo] = useState(null)
    // upload - байты уходят на сервер, processing - сервер жмёт и заливает в S3
    let [stage, setStage] = useState('')
    let [link, setLink] = useState('')
    let [dragOver, setDragOver] = useState(false)
    // dragenter/dragleave летят и с дочерних элементов - считаем глубину, чтобы подсветка не мигала
    let dragDepth = useRef(0)

    useEffect(() => {
        updateVideo({comment})
    }, [comment])

    useEffect(() => {
        err && window.notify.error(err)
    }, [err])

    let updateVideo = async (data) => {
        video && video._id && await global.http.put('/my-upload-video', {_id: video._id, ...data || {}})
    }

    let onChange = async (file) => {
        let fileSize = file.size;
        let originalFileName = file.name;
        let hash = new Date().getTime();

        let info = {
            name: originalFileName,
            fileSize,
            duration: '-'
        }

        setFile(file)
        setComment('')
        setInfo(info)
        setProgress(0)
        setStage('')
        setVideo({})
        setErr('')

        window.setFile = setFile
        let onErr = (err) => {
            setFile(null)
            setErr(err)
            setOpen(true)
            $('#fileWrapElTest').val('')
        }

        getDuration(file, async (duration) => {
            info.duration = duration;

            setInfo({})
            if (fileSize > 500 * 1000 * 1000) {
                return onErr(t('tooBig'))
            }
            if (!duration) {
                return onErr(t('errIncorrect'))
            }
            let mbPerHour = 300 * 1000 * 1000;
            let maxFs = (duration / 60) * mbPerHour;
            let toMb = (fileSize) => {
                return Math.round(fileSize / (1000 * 1000))
            }

            if (fileSize > maxFs) {
                return onErr(t('tooGreat') + `${t('tooGreat2')}. ${toMb(maxFs)}${t('mb')}.\n${t('tooGreat3')}${toMb(fileSize)}${t('mb')}`)
            }

            setInfo(info)

            let domain = global.env.VIDEO_DOMAIN;
            let token = user.get_token();
            try {
                let video = await global.http.post('/my-upload-video', {hash, info, hostname: window.location.hostname})
                setVideo(video)

                setStage('upload')
                let started = await startVideoProcess({
                    domain, token, file,
                    user: user.get_id(),
                    onUploadProgress: setProgress,
                })
                setProgress(100)
                setStage('processing')

                let job = await waitVideoProcess({domain, token, id: started.id})
                let s3Info = buildS3UploadInfo({job, name: originalFileName, duration})
                await global.http.put('/my-upload-video', {_id: video._id, info: s3Info})
                setInfo(s3Info)
                setLink(job.url || '')
                setStage('done')
            } catch (e) {
                setStage('error')
                setErr(uploadErrorMessage(e))
            }
        });
    }

    let getDuration = (file, cb) => {

        var video = document.createElement('video');
        video.preload = 'metadata';

        video.onloadedmetadata = function () {
            window.URL.revokeObjectURL(video.src);
            let duration = video.duration;
            cb && cb(+(duration / 60).toFixed(1))
        }

        video.onerror = () => {
            cb && cb(0)
        }

        video.src = URL.createObjectURL(file);
    }
    let toMb = (size) => {
        return +((size / (1000 * 1000)) || 0).toFixed(1)
    }

    return <div className={'card'}>

        <div className="card-body animChild">
            <MyModal
                isOpen={open}
                onClose={() => setOpen(false)}
            >
                {err && <div className="alert alert-danger">
                    {err}
                </div>}
                <div></div>
                {t('instructionSoon')}
                <div>
                    {t('curatorConsultation')}
                </div>
                <div></div>
            </MyModal>
            <h4 className="card-title">
                <i className="iconoir-download" style={{marginBottom: '-2.5px', marginRight: '5px'}}></i>
                {t('videoUploading')}</h4>


            <div>
                {t('link')}: {!link && <b>{t('selectFileFirst')}</b>}
                {!!link &&
                    <><a href={link} target={"_blank"}>{link}</a>
                        <div className="fa fa-copy" style={{marginRight: '10px', fontSize: '20px'}} onClick={() => {
                            copyText(link)
                        }}></div>
                    </>}
                {file && <Textarea
                    placeholder={t('commentAnnotation')}
                    value={comment} onChange={(v) => {
                    setComment(v)
                }
                }/>}
                {/*{info?.fileName && <Input value={link} onClick={(e) => {*/}
                {/*    let el = e.target;*/}
                {/*    el.select();*/}
                {/*    el.focus();*/}
                {/*}}/>}*/}
            </div>
            <hr/>



            {file && <>
                <div className="row">
                    {/*<div className="col-sm-6">*/}
                    {/*    <Textarea*/}
                    {/*        placeholder={'Комментарий-аннотация к видео'}*/}
                    {/*        value={comment} onChange={(v) => {*/}
                    {/*        setComment(v)*/}
                    {/*    }*/}
                    {/*    }/>*/}
                    {/*</div>*/}
                    <div className="col-sm-12">
                        {t('fileSize')}: {toMb(info.fileSize)} {t('mb')}
                        <div></div>
                        {t('duration')}: {info.duration} {t('minutesShort')}
                    </div>
                </div>


                <hr/>
                {stage === 'upload' && <>
                    Загрузка файла: {progress}%
                    <Perc value={progress} height={3}></Perc>
                </>}
                {stage === 'processing' && <>
                    Файл загружен, сервер сжимает видео. Это займёт несколько минут, страницу не закрывайте
                    <div className="progress" style={{height: '3px'}}>
                        <div className="progress-bar progress-bar-striped progress-bar-animated" style={{width: '100%'}}></div>
                    </div>
                </>}
                {stage === 'done' && <div className="text-success">Видео загружено и обработано</div>}
                {stage === 'error' && <div className="text-danger">Не удалось загрузить видео: {err}. Выберите файл ещё раз</div>}

            </>}
            <div style={{marginTop: '20px'}}></div>
            <div
                role="button"
                tabIndex={0}
                className={'videoDropzone' + (dragOver ? ' dragOver' : '')}
                onClick={() => {
                    $('#fileWrapElTest').click()
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        $('#fileWrapElTest').click()
                    }
                }}
                onDragEnter={(e) => {
                    if (!isFileDrag(e.dataTransfer)) return
                    e.preventDefault()
                    dragDepth.current++
                    setDragOver(true)
                }}
                onDragOver={(e) => {
                    if (!isFileDrag(e.dataTransfer)) return
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'copy'
                }}
                onDragLeave={() => {
                    dragDepth.current = Math.max(0, dragDepth.current - 1)
                    !dragDepth.current && setDragOver(false)
                }}
                onDrop={(e) => {
                    e.preventDefault()
                    dragDepth.current = 0
                    setDragOver(false)
                    let dropped = pickDroppedFile(e.dataTransfer)
                    if (!dropped) {
                        return window.notify?.error('Перетащите видеофайл: mp4, mov, webm или другой формат видео')
                    }
                    onChange(dropped)
                }}
            >
                <i className="iconoir-upload videoDropzoneIcon"></i>
                <div className="videoDropzoneTitle">
                    {dragOver ? 'Отпустите, чтобы загрузить' : (info.name || t('selectFile'))}
                </div>
                {!dragOver && <div className="videoDropzoneHint">
                    {info.name ? 'Перетащите другое видео или нажмите, чтобы выбрать' : 'или перетащите видео сюда'}
                </div>}
            </div>
            <style>{`
                .videoDropzone {
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    gap: 4px; min-height: 140px; padding: 24px 16px; text-align: center; cursor: pointer;
                    border: 2px dashed var(--bs-primary); border-radius: var(--bs-border-radius-lg, 8px);
                    background: var(--bs-primary-bg-subtle); color: var(--bs-primary);
                    transition: background-color .15s ease, border-color .15s ease;
                }
                .videoDropzone:hover { background: rgba(var(--bs-primary-rgb), .14); }
                .videoDropzone:focus-visible { outline: 3px solid rgba(var(--bs-primary-rgb), .4); outline-offset: 2px; }
                .videoDropzone.dragOver { border-style: solid; background: rgba(var(--bs-primary-rgb), .2); }
                .videoDropzoneIcon { font-size: 28px; line-height: 1; transition: transform .15s ease; }
                .videoDropzone.dragOver .videoDropzoneIcon { transform: translateY(-3px); }
                .videoDropzoneTitle { font-weight: 600; word-break: break-word; }
                .videoDropzoneHint { font-size: 13px; opacity: .75; }
                .videoDropzone * { pointer-events: none; }
                @media (prefers-reduced-motion: reduce) { .videoDropzone, .videoDropzoneIcon { transition: none; } }
            `}</style>
            {/*<div className={'fileWrap'}*/}
            {/*     onClick={() => {*/}
            {/*         $('#fileWrapElTest').click()*/}
            {/*     }}>{info.name || 'Выберите файл'}</div>*/}
            <div style={{display: 'none'}}>
            <input style={{opacity: 0}} id="fileWrapElTest" type="file" file={file} onChange={(e) => {
                let file = e.target.files[0];
                //console.log("qqqqq fileeee", file);
                onChange(file)
            }}/>
            </div>
            {/*<div style={{padding: '20px'}} className={'tc'}>*/}
            {/*<img src="/st/select.svg" alt="" style={{width: '200px'}}/>*/}
            {/*</div>*/}
        </div>
    </div>
}

export function copyText(text) {
    const textarea = document.createElement('textarea');

    // Set its value to the text you want to copy
    textarea.value = text;

    // Make sure it's not visible on the screen
    textarea.setAttribute('readonly', ''); // Prevents keyboard from appearing on mobile devices
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';

    // Append it to the body
    document.body.appendChild(textarea);

    // Select the text
    textarea.select();
    textarea.setSelectionRange(0, 99999); // For mobile devices

    try {
        // Copy the text inside the textarea
        const successful = document.execCommand('copy');
        const msg = successful ? 'successful' : 'unsuccessful';
        //console.log('Copying text command was ' + msg);
    } catch (err) {
        console.error('Oops, unable to copy', err);
    }

    // Remove the textarea from the body
    document.body.removeChild(textarea);
    window.notify?.success('Ссылка скопирована!')
}

export default Layout2
