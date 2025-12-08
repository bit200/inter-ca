import React, {useRef, useState} from "react";
import './Player.css'
export default function Player(props) {
    let [process, setProcess] = useState(false);
    let [slider, setSlider] = useState(1);
    let ref = useRef()
    let {children} = props;
    let togglePlay = () => {
        setProcess(!process)
        if (process) {
            ref.current.pause()
        } else {
            ref.current.play()
        }
    }

    let scrollTo

    return <div>

        <audio src={props.src} ref={ref} controls style={{opacity: 1, height: 100, overflow: 'hidden'}}></audio>



        <div className="player">
            <div className="player-flex">
                <div className="buttons">Back</div>
                <div className="buttons" onClick={() => {togglePlay()}}>
                    Play</div>
                <div className="buttons">Next</div>
                <div className="timers">Timers</div>
                <div className="scroll">
                    <input type="range" id="volume-slider" min="0" max="1.01" step="0.001" value={slider} onChange={(e) => {
                        setSlider(e.target.value)
                    }}/>
                </div>
                <div className="speed">
                    <select>
                        <option>0.75</option>
                        <option>1</option>
                        <option>1.5</option>
                        <option>2</option>
                    </select>
                </div>
            </div>
        </div>
    </div>

}



