import React, {useState, useEffect} from 'react';
import {recognitionInit, recognitionStart, recognitionStop} from "./TrainMethods/AudioShort/AudioShort";
import mic from "./TrainMethods/AudioShort/mic.svg";
import MyImg from "./MyImg";

let mediaRecorder;
let chunks = [];

function Layout2(props) {
    let [process, setProcess] = useState(false)
    let [src, setSrc] = useState('')
    //console.log('*........ ## ROOT RENDER', props);

    useEffect(() => {
        // recognitionInit()
        // setTimeout(() => {
        //     recognitionStart(() => {
        //         console.log("qqqqq rec start", );
        //     })
        // })
        myPlayer({src: src})

    }, [src])

    function toggleRecording() {
        if (process) {
            stopRecording()
            setProcess(false)
        } else {
            startRecording()
        }
    }


    const startRecording = async () => {
        try {

            setSrc('')
            chunks = [];
            const stream = await navigator.mediaDevices.getUserMedia({audio: true});
            mediaRecorder = new MediaRecorder(stream);

            mediaRecorder.ondataavailable = (e) => {
                chunks.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(chunks, {type: 'audio/wav'});
                const audioUrl = URL.createObjectURL(audioBlob);
                setSrc(audioUrl)
            };

            mediaRecorder.start();
            setProcess(true)

        } catch (e) {
            alert('Ошибка подключения микрофона')
        }

    };

    const stopRecording = () => {
        mediaRecorder.stop();
    };

    // let v = useActionData();
    return <div className={'card'}>

        <div className="card-body">
            <div className={'tc animChild'}>
                {/*{src}*/}
                {/*<audio controls id="audioPlayback" src={src} autoPlay={true}></audio>*/}
                {/*<hr/>*/}
                <div className={"svgContainer rel" + (process ? ' animate recProcess' : '')} onClick={() => {
                    toggleRecording()
                }}>
                    <div>
                        <div className="zoomChild">
                            <div className="svg-box">
                                <div className={'counting'}>{'.'}</div>
                                <i className="iconoir-microphone mic" style={{fontSize: '40px'}}></i>
                                {/*<div className="iconoir-microphone-speaking"></div>*/}
                                {/*<img src={mic} alt="" width={40} height={40}/>*/}
                            </div>
                            <div className="circle delay1"></div>
                            <div className="circle delay2"></div>
                            <div className="circle delay3"></div>
                            <div className="circle delay4"></div>
                        </div>
                    </div>
                </div>
                <div className="mt-10" style={{marginTop: '20px'}}>
                    <div className="mt-10">
                        <Button
                            size={'sm'}
                            onClick={(cb) => {
                                cb && cb()
                                toggleRecording()
                            }}
                        >{process ? t('stop') : t('startTestRecord')}</Button>
                    </div>
                </div>

                <div style={{padding: '20px 0'}}>
                    <MyImg width={350}>call</MyImg>
                    {/*<img src="/st/call.svg" alt="" style={{width: '350px'}}/>*/}
                </div>
                <div>
                    <hr/>
                    {t('micRecMsg')}

                </div>
            </div>
        </div>
    </div>
}

export default Layout2
