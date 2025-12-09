import React, {useEffect, useState} from "react";
import _ from 'underscore';

let intervalId;

export function CountDownSecs(props) {
    let [count, setCount] = useState(props.count)

    console.log("qqqqq TIMER PROPS", props);
    let byMs = 500;
    useEffect(() => {
        if (!props.count && props.active) {
            return props.onStop && props.onStop()
        }
        if (!props.count || !props.active) {
            return clearInterval(intervalId)
        }
        clearInterval(intervalId)

        setCount(props.count * 1000)
        intervalId = setInterval(() => {

            setCount((prevSeconds) => {
                // console.log("qqqqq trigger timers", prevSeconds);

                //console.log("qqqqq prev trigger secondssssss", {intervalId, prevSeconds});
                if (prevSeconds < 0) {
                    props.onChange && props.onChange(0, 0)
                    clearInterval(intervalId)
                    return 0

                }
                if (prevSeconds == 0) {
                    props.onChange && props.onChange(0, 0)
                    clearInterval(intervalId)
                    props.onStop && props.onStop()
                    return;
                }
                let ms = prevSeconds - byMs;
                let sec = ms / 1000;
                props.onChange && props.onChange(sec, 100 * sec / (props.totalTime || props.time))
                //
                // if (sec == Math.round(sec)) {
                // }
                return ms;
            });
        }, byMs);

        return () => clearInterval(intervalId);
    }, [props.iteration, props.active])
    return props.hideValue ? null : <>{count}</>
}
