import CallPlayer from './CallPlayer';
import './Player.css'
import {useEffect, useRef, useState} from "react";

export default function Player(props) {

    let [src, setSrc] = useState('')
    let [open, setOpen] = useState(false)
    let [text, setText] = useState('')
    let [playerKey, setPlayerKey] = useState(0)
    let [loading, setLoading] = useState(false)
    let playerRef = useRef(null)
    let autoplayTimerRef = useRef(null)
    // Плеер открывается только по canplay от свежего src. Браузер шлёт canplay и
    // после перемотки - в том числе от сброса currentTime при закрытии, поэтому
    // без этого флага крестик тут же снова открывал плеер и включал запись.
    let awaitingOpenRef = useRef(false)

    // Закрытие плейера должно глушить звук: снятие src с <audio> само по себе
    // воспроизведение не прерывает, а отложенный autoplay может стартовать уже
    // после закрытия - поэтому и таймер, и сам элемент гасим явно.
    let stopPlayback = () => {
        awaitingOpenRef.current = false
        clearTimeout(autoplayTimerRef.current)
        autoplayTimerRef.current = null
        let player = playerRef.current
        if (!player) return
        player.pause()
        player.currentTime = 0
    }

    let onChangeSrc = (newSrc) => {
        if (!newSrc && newSrc !== '') {
            return;
        }
        awaitingOpenRef.current = !!newSrc;
        setLoading(true);
        setPlayerKey(k => k + 1);
        console.log('LOOOG newSrc', newSrc);
        setSrc(newSrc);
        // Плейер откроется только когда аудио готово к воспроизведению (onCanPlay)
    }

    let onCanPlay = () => {
        if (!awaitingOpenRef.current) return;
        awaitingOpenRef.current = false;
        setLoading(false);
        setOpen(true);
        window.dispatchEvent(new Event('myPlayerReady'));
    }

    useEffect(() => {
        $('body').toggleClass('playing', open)

        // autoplay с включаем после появления ui
        if(open){
            autoplayTimerRef.current = setTimeout(() => {
                playerRef.current?.play();
            }, 1_000) // Задержка для плавности UI воспроизведение начинается с появление плейера
        } else {
            stopPlayback()
        }

    }, [open])

    useEffect(() => () => stopPlayback(), [])

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
                .catch(() => window.dispatchEvent(new Event('myPlayerError')))
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
            stopPlayback()
            setOpen(false)
        }
    }

    const hasSrc = !!src;
    return <div className={'player' + (open ? ' opened' : '') + (hasSrc && !open ? ' loading' : '') + (text ? ' has-text' : '')}>
        <div className="iconoir-xmark fa fa-times player-close" onClick={() => {
            stopPlayback()
            setSrc('')
            setOpen(false)
        }}></div>
        <div className="player-body">
            {loading && src && <div className="player-spinner"><div className="player-spinner-inner"/></div>}
            <CallPlayer
                ref={playerRef}
                key={playerKey}
                src={src}
                onLoadStart={() => setLoading(true)}
                onCanPlay={onCanPlay}
            />
            {text ? <div className="text-muted player-text">{text}</div> : null}
        </div>
    </div>
};
