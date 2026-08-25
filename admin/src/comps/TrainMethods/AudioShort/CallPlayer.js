import {forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState} from "react";
import {
    formatPlaybackRate,
    formatPlayerClock,
    playbackRates,
    playerSeekStepSeconds,
    waveformBars,
} from "./playerFormat";

let iconProps = (size) => ({
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
});

let PlayIcon = () => <svg {...iconProps(19)} fill="currentColor" stroke="none"><path d="M7 4.5 19 12 7 19.5z"/></svg>;
let PauseIcon = () => <svg {...iconProps(19)} fill="currentColor" stroke="none"><rect x="6.5" y="5" width="3.6" height="14" rx="1.2"/><rect x="13.9" y="5" width="3.6" height="14" rx="1.2"/></svg>;
let BackIcon = () => <svg {...iconProps(15)}><path d="M3 12a9 9 0 1 0 2.5-6.2L3 8"/><path d="M3 3v5h5"/></svg>;
let ForwardIcon = () => <svg {...iconProps(15)}><path d="M21 12a9 9 0 1 1-2.5-6.2L21 8"/><path d="M21 3v5h-5"/></svg>;
let VolumeIcon = () => <svg {...iconProps(17)}><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>;
let VolumeOffIcon = () => <svg {...iconProps(17)}><path d="M11 5 6 9H2v6h4l5 4z"/><path d="m16 9 5 6"/><path d="m21 9-5 6"/></svg>;

// Плеер записи: круглая кнопка, перемотка на 15 секунд, волна, скорость и громкость
const CallPlayer = forwardRef(function CallPlayer(
    {src, disabled, onError, onEnded, onPlay, onPause, onCanPlay, onLoadStart},
    ref,
) {
    let audioRef = useRef(null);
    let [playing, setPlaying] = useState(false);
    let [currentTime, setCurrentTime] = useState(0);
    let [duration, setDuration] = useState(0);
    let [rate, setRate] = useState(1);
    let [rateOpen, setRateOpen] = useState(false);
    let [muted, setMuted] = useState(false);
    let [volume, setVolume] = useState(1);
    useImperativeHandle(ref, () => audioRef.current, []);

    let bars = useMemo(() => waveformBars(src || ''), [src]);
    let progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
    let idle = disabled || !src;

    useEffect(() => {
        setCurrentTime(0);
        setDuration(0);
        setPlaying(false);
    }, [src]);
    useEffect(() => {
        if (audioRef.current) audioRef.current.playbackRate = rate;
    }, [rate, src]);

    let withPlayer = (action) => {
        let player = audioRef.current;
        if (player && !idle) action(player);
    };
    let toggle = () => withPlayer(player => {
        if (player.paused) {
            let started = player.play();
            if (started && started.catch) started.catch(() => setPlaying(false));
        } else player.pause();
    });
    let seekBy = (offset) => withPlayer(player => {
        player.currentTime = Math.max(0, Math.min(player.duration || 0, player.currentTime + offset));
    });
    let readDuration = (el) => setDuration(Number.isFinite(el.duration) ? el.duration : 0);

    return <div className={'call-player' + (idle ? ' is-idle' : '') + (playing ? ' is-playing' : '')}>
        <audio
            ref={audioRef}
            src={src || undefined}
            preload="metadata"
            onLoadStart={onLoadStart}
            onCanPlay={onCanPlay}
            onError={() => { setPlaying(false); onError && onError(); }}
            onPlay={() => { setPlaying(true); onPlay && onPlay(); }}
            onPause={() => { setPlaying(false); onPause && onPause(); }}
            onEnded={() => { setPlaying(false); onEnded && onEnded(); }}
            onDurationChange={e => readDuration(e.currentTarget)}
            onLoadedMetadata={e => { e.currentTarget.playbackRate = rate; readDuration(e.currentTarget); }}
            onTimeUpdate={e => setCurrentTime(e.currentTarget.currentTime)}
        />
        <button type="button" className="call-player-play" disabled={idle}
                aria-label={playing ? 'Пауза' : 'Слушать запись'}
                title={playing ? 'Пауза' : 'Слушать запись'} onClick={toggle}>
            {playing ? <PauseIcon/> : <PlayIcon/>}
        </button>
        <div className="call-player-jumps">
            <button type="button" disabled={idle}
                    aria-label={`Назад на ${playerSeekStepSeconds} секунд`}
                    title={`Назад на ${playerSeekStepSeconds} секунд`}
                    onClick={() => seekBy(-playerSeekStepSeconds)}><BackIcon/><small>{playerSeekStepSeconds}</small></button>
            <button type="button" disabled={idle}
                    aria-label={`Вперёд на ${playerSeekStepSeconds} секунд`}
                    title={`Вперёд на ${playerSeekStepSeconds} секунд`}
                    onClick={() => seekBy(playerSeekStepSeconds)}><ForwardIcon/><small>{playerSeekStepSeconds}</small></button>
        </div>
        <div className="call-player-track">
            <div className="call-player-wave" aria-hidden="true">
                {bars.map((height, index) => <span key={index}
                                                   className={index / bars.length < progress ? 'is-played' : ''}
                                                   style={{height: `${Math.round(height * 100)}%`}}/>)}
            </div>
            <input
                type="range"
                className="call-player-scrub"
                min={0}
                max={Math.max(duration, 0.1)}
                step={0.05}
                value={Math.min(currentTime, Math.max(duration, 0.1))}
                disabled={idle || duration <= 0}
                aria-label="Позиция воспроизведения"
                aria-valuetext={`${formatPlayerClock(currentTime)} из ${formatPlayerClock(duration)}`}
                onChange={e => {
                    let value = Number(e.currentTarget.value);
                    withPlayer(player => { player.currentTime = value; setCurrentTime(value); });
                }}
            />
        </div>
        <span className="call-player-clock"><strong>{formatPlayerClock(currentTime)}</strong>/{formatPlayerClock(duration)}</span>
        <div className="call-player-rate"
             onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setRateOpen(false); }}
             onKeyDown={e => { if (e.key === 'Escape') setRateOpen(false); }}>
            <button type="button" disabled={idle} aria-haspopup="true" aria-expanded={rateOpen}
                    title="Скорость воспроизведения"
                    onClick={() => setRateOpen(open => !open)}>{formatPlaybackRate(rate)}</button>
            {rateOpen && <ul role="menu" aria-label="Скорость воспроизведения">
                {playbackRates.map(value => <li key={value}>
                    <button type="button" role="menuitemradio" aria-checked={value === rate}
                            className={value === rate ? 'active' : ''}
                            onClick={() => { setRate(value); setRateOpen(false); }}>{formatPlaybackRate(value)}</button>
                </li>)}
            </ul>}
        </div>
        <div className="call-player-volume">
            <button type="button" disabled={idle} aria-label={muted ? 'Включить звук' : 'Выключить звук'}
                    title={muted ? 'Включить звук' : 'Выключить звук'}
                    onClick={() => {
                        let next = !muted;
                        setMuted(next);
                        if (audioRef.current) audioRef.current.muted = next;
                    }}>
                {muted || volume === 0 ? <VolumeOffIcon/> : <VolumeIcon/>}
            </button>
            <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
                   aria-label="Громкость" disabled={idle}
                   onChange={e => {
                       let next = Number(e.currentTarget.value);
                       setVolume(next);
                       setMuted(next === 0);
                       if (audioRef.current) {
                           audioRef.current.volume = next;
                           audioRef.current.muted = next === 0;
                       }
                   }}/>
        </div>
    </div>;
});

export default CallPlayer;
