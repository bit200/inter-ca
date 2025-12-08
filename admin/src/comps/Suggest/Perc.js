import React, {useState} from 'react';
import _ from 'underscore';
import './Perc.css';

function Perc(props) {
   //console.log('*........ ## ROOT RENDER', props);


    let {value, top = 0, height = 7} = props || {};

    return <div className={'percWrap'} style={{height: height + 'px', marginTop: top + 'px'}}>
        <div className="percValue" style={{width: value + '%'}}></div>
    </div>
}

export default Perc
