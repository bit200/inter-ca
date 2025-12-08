import React, {useState, useEffect} from 'react';
import Perc from "./Suggest/Perc";
import Input from "../libs/Input";
import Textarea from "../libs/Textarea";
import MyModal from "../libs/MyModal";

function Layout2(props) {
    //console.log('*........ ## ROOT RENDER', props);

    let [open, setOpen] = useState(false)
    let [comment, setComment] = useState('')
    let [progress, setProgress] = useState(0)
    let [err, setErr] = useState('')
    let [info, setInfo] = useState({})
    let [file, setFile] = useState(null)
    let [video, setVideo] = useState(null)

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
        console.log("qqqqq file", file);
        const url = global.env.VIDEO_UPLOAD_DOMAIN + '/file-upload'; // Your Node.js server URL
        const chunkSize = 1024 * 1024 * 5; // 5MB chunk size
        let start = 0;
        let fileSize = file.size;
        let originalFileName = file.name;
        let hash = new Date().getTime();

        const extension = file.name.split('.').pop();
        let fileName = `${hash}.${extension}`


        let info = {
            name: originalFileName,
            fileName,
            chunkSize,
            fileSize,
            duration: '-'
        }

        setFile(file)
        setComment('')
        setInfo(info)
        setProgress(0)
        setVideo({})
        setErr('')


        window.setFile = setFile


        let onErr = (err) => {
            setFile(null)
            setErr(err)
            setOpen(true)
            $('#fileWrapElTest').val('')
        }

        if (fileSize > 5 * 1000 * 1000) {
            return onErr('Слишком большой размер файла. Разрешимый объем до 5Мб')
        }




        let video = await global.http.post('/my-upload-video', {
            type: 'img',
            hash, info, hostname: window.location.hostname})
        setVideo(video)


        //console.log("qqqqq video", video);
        while (start < fileSize) {
            try {

                setProgress(Math.round(100 * start / fileSize))
                const end = start + chunkSize;
                const chunk = file.slice(start, end);

                const formData = new FormData();
                formData.append('user', user.get_id());
                formData.append('chunk', chunk, fileName);

                let t = await fetch(url, {
                    method: 'POST',
                    body: formData
                });

                start = end;
            } catch (e) {
                // await updateVideo({_id: video._id, status: 'error'})//global.http.put('/my-upload-video', {_id: video._id, status: 'error', info})
                //
                return setErr(e.toString())
            }

        }

        setProgress(100)
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

    let getLink = () => {
        return `${env.VIDEO_STATIC_DOMAIN}/file/${user.get_id()}/${info.fileName}`
    }
    // let v = useActionData();

    let link = getLink();
    return <div>

        <MyModal
            isOpen={open}
            onClose={() => setOpen(false)}
        >
            {err && <div className="alert alert-danger">
                {err}
            </div>}
            <div></div>
            Интсрукция по компрессии видео перед загрузкой в ближайшее время появится здесь!
            <div>
                На данный момент обратитесь пожалуйста к Сергею Титову за консультацией
            </div>
            <div></div>
        </MyModal>
        Загрузите файла.

        <div>
            Ссылка: {!info?.fileName && <b>Выберите в начале файл</b>}
            {!!info?.fileName &&
                <><a href={link} target={"_blank"}>{link}</a>
                    <div className="fa fa-copy" style={{marginRight: '10px', fontSize: '20px'}} onClick={() => {
                        copyText(link)
                    }}></div>
                </>}
            {file && <Textarea
                placeholder={'Комментарий-аннотация к файлу'}
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
                    Размер файла: {toMb(info.fileSize)} Мб
                    <div></div>
                    Продолжительность: {info.duration} мин
                </div>
            </div>


            <hr/>
            <>
                Прогресс: {progress}%
                <Perc value={progress} height={3}></Perc>
            </>

        </>}
        <div style={{marginTop: '20px'}}></div>
        <div className={'fileWrap'}
             onClick={() => {
                 $('#fileWrapElTest').click()
             }}>{info.name || 'Выберите файл'}</div>
        <input style={{opacity: 0}} id="fileWrapElTest" type="file" file={file} onChange={(e) => {
            let file = e.target.files[0];
            //console.log("qqqqq fileeee", file);
            onChange(file)
        }}/>
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
