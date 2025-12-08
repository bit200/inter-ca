import React, {useState} from 'react';

function Layout2(props) {
    //console.log('*........ ## ROOT RENDER', props);


    // let v = useActionData();
    let src = props.src || props.s || props.children;
    let w = props.w || props.width;
    let style = {}
    let title = props.title || ''
    if (props.bottom) {
        style.marginBottom = (props.bottom + 'px').replace('pxpx', 'px')
    }
    if (props.top) {
        style.marginTop = (props.top + 'px').replace('pxpx', 'px')
    }
    let name = props.children || props.src;
    return <>
        <div className={'tc w100'} style={style}>
            <img src={`/st/${name}.svg`} alt="" width={w + 'px'} className={'visLight'}/>
            <img src={`/st/${name}-dark.svg`}  alt="" width={w + 'px'} className={'visDark'}/>
        </div>
        {title && <h5 className={'tc'} style={{marginTop: '35px', display: 'block'}}>{t(title)}</h5>}
    </>
}

export default Layout2
