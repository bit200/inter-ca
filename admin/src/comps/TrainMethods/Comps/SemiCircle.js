import React from "react";


const data = {
    "initial": {
        "unit": "GB",
        "value": 2
    },
    "remaining": {
        "unit": "GB",
        "value": 0.9
    },
    "type": "Internet",
};

function SemiCircleChart({min, max, value, zoom, title}) {
    min = Math.max(min || 0, 5)
    max = max || 100;

    const angle = (value / max) * 180;
    const style = {'--angle': angle + 'deg'};

    return (
        <div className="sc-gauge" style={{zoom: .25 * (zoom || 1)}} title={title || null}>
            <div className="sc-background">
                <div className="sc-percentage" style={style}></div>
                <div className="sc-mask"></div>
                <span className="sc-value">{value}%</span>
            </div>
            {/*<span className="sc-min">{min}</span>*/}
            {/*<span className="sc-max">{max}</span>*/}
        </div>)

}
export default SemiCircleChart


