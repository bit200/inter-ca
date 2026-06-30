import AudioPlayer from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';
import './Player.css'
import {useEffect, useRef, useState} from "react";

export default function Player(props) {

    let [src, setSrc] = useState('')
    let [open, setOpen] = useState(false)
    let [text, setText] = useState('')
    let [playerKey, setPlayerKey] = useState(0)
    let [loading, setLoading] = useState(false)
    let playerRef = useRef(null)

    let onChangeSrc = (newSrc) => {
        if (!newSrc && newSrc !== '') {
            return;
        }
        setLoading(true);
        setPlayerKey(k => k + 1);
        console.log('LOOOG newSrc', newSrc);
        setSrc(newSrc);
        // Плейер откроется только когда аудио готово к воспроизведению (onCanPlay)
    }

    let onCanPlay = () => {
        setLoading(false);
        setOpen(true);

    }

    useEffect(() => {
        $('body').toggleClass('playing', open)

        // autoplay с включаем после появления ui
        if(open){
            setTimeout(() => {
                playerRef.current?.audio?.current?.play();
            }, 1_000) // Задержка для плавности UI воспроизведение начинается с появление плейера
        }

    }, [open])

    useEffect(() => {
        onChangeSrc(props.src)
    }, [props.src])

    window.myPlayer = (props) => {
        setText(props.text || '')
        if (props.hash) {
            const token = user.get_token();
            fetch(global.env.VIDEO_DOMAIN + `/audio/${props.user}/${props.hash}`, { headers: { authorization: token } })
                .then(r => r.json())
                .then(({url}) => onChangeSrc(url))
            return
        }
        if (props.path) {
            let src = global.env.VIDEO_DOMAIN + '/audio' + props.path;
            onChangeSrc(src)
        }
        if (props.src || props.src == '') {
            onChangeSrc(props.src)
        }
        if (props.src == '') {
            setOpen(false)
        }
    }

    const hasSrc = !!src;
    return <div className={'player' + (open ? ' opened' : '') + (hasSrc && !open ? ' loading' : '')}>
        <div className="iconoir-xmark fa fa-times player-close" onClick={() => {
            setSrc('')
            setOpen(false)
        }}></div>
        <div className="row">
            <div className={text ? "col-sm-7" : "col-sm-12"}>
                {loading && src && <div className="player-spinner"><div className="player-spinner-inner"/></div>}
                <AudioPlayer
                    ref={playerRef}
                    key={playerKey}
                    autoPlay={false}
                    loop={false}
                    autoPlayAfterSrcChange={false}
                    src={src}
                    onLoadStart={() => setLoading(true)}
                    onCanPlay={onCanPlay}
                    onClickNext={() => {}}
                />
            </div>
            <div className="col-sm-5 text-muted">
                <div style={{maxHeight: '90px', overflowY: 'auto'}}>
                    {text}</div>
            </div>
        </div>
    </div>
};
