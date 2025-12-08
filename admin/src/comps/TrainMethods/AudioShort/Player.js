import AudioPlayer from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';
import './Player.css'
import {useEffect, useState} from "react";
// import 'react-h5-audio-player/lib/styles.less' Use LESS
// import 'react-h5-audio-player/src/styles.scss' Use SASS

export default function Player(props) {

    let [src, setSrc] = useState('')
    let [open, setOpen] = useState(false)
    let [text, setText] = useState('')

    let onChangeSrc = (src) => {
        setSrc('')
        setTimeout(() => {
            setSrc(src)
        })

        if (!src && src != '') {
            return;
        }
        setOpen(true)
    }
    useEffect(() => {
        $('body').toggleClass('playing', open)
    }, [open])
    useEffect(() => {
        onChangeSrc(props.src)
    }, [props.src])

    window.myPlayer = (props) => {
        setText(props.text || '')
        console.log("qqqqq prosppppppppppppppppp", props);
        if (props.hash) {
            let src = global.env.VIDEO_DOMAIN + `/audio/${props.user}/${props.hash}.wav`;
            console.log("qqqqq SRCCCCCCC", );
            return onChangeSrc(src)
        }
        if (props.path) {
            let src = global.env.VIDEO_DOMAIN + '/audio' + props.path;
           //console.log("qqqqq srccccccccc", src);
            onChangeSrc(src)
        }
        if (props.src || props.src == '') {
            onChangeSrc(props.src)

        }
        if (props.src == '') {
            setOpen(false)
        }
    }
    return <div className={'player ' + (open ? ' opened' : '')}>
        <div className="iconoir-xmark fa fa-times player-close" onClick={() => {
            setSrc('')
            setOpen(false)
        }}></div>
        <div className="row">
            <div className={text ? "col-sm-7" : "col-sm-12"}>
                <AudioPlayer
                    autoPlay
                    loop={false}
                    autoPlayAfterSrcChange={true}
                    src={src}
                    onPlay={e => console.log("onPlay")}

                    onClickNext={e => console.log("next")}
                />
            </div>
            <div className="col-sm-5 text-muted"
            >
                <div style={{maxHeight: '90px', overflowY: 'auto'}}>
                    {text}</div>
            </div>
        </div>
    </div>
};