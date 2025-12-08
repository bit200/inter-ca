import React, {useState, useEffect} from 'react';
import _ from 'underscore';

import {
    Link, Outlet
} from "react-router-dom";

function generateLogoBackgroundColor(initials, str) {
    let hash = 0;
    str = str || initials
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Mapping the hash code to Hue, Saturation, and Lightness
    const hue = hash % 360;
    const saturation = 45 + (hash % 10); // Range from 20% to 60%
    const lightness = 85 + (hash % 5); // Range from 30% to 70%

    let res = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    // console.log('xxxxxNameeee',{initials, str}, hash)
    return res;

    // if (initials.length < 2) {
    //   return "hsl(0, 0%, 90%)"; // Default color if less than two initials provided
    // }

    // // Using first two initials
    // const charCode1 = initials.charCodeAt(0) % 256;
    // const charCode2 = initials.charCodeAt(1) % 256;

    // const hue = (charCode1 + charCode2 * 137) % 360; // Golden angle to ensure unique hues
    // const color = `hsl(${hue}, 50%, 90%)`; // Using HSL with 40% saturation and 80% lightness for a bright color

    // return color;
}
let userGrades = ['Джун', 'Джун+', 'Миддл', 'Сеньор']

function getTitle(it) {
    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        // second: '2-digit',
        // timeZoneName: 'short'
    };

    let userId = it.userId || it._id || it.user;
    return `#${userId} ${it.name || '--'}\nУровень на момент апрува: ${userGrades[it.grade || 0]}\nДата: ${new Date(it.cd).toLocaleString(undefined, options)}`
}

function Layout2(props) {

    let [users, setUsers] = useState([])

    useEffect(() => {
        props.item && setUsers(((props.item || {}).contributors || []).map(it => {
            let [FN = '', SN = ''] = (it.name || '').split(' ')
            let _SN = `${FN[0] || ''}${SN[0] || ''}`.toUpperCase();
            return {...it, color: generateLogoBackgroundColor(_SN, it.name), _SN}
        }))
    }, [props.item])
    useEffect(() => {
        props.version && setUsers((props.version.owner ? [props.version.owner] : []).map(it => {

            let [FN = '', SN = ''] = (it.name || '').split(' ')
            let _SN = `${FN[0] || ''}${SN[0] || ''}`.toUpperCase();
            return {...it, color: generateLogoBackgroundColor(_SN, it.name), _SN}
        }))
    }, [props.version])

    if (!users || !users.length) {
        return <div>-</div>
    }

    let {size = 30, left = 0, top = 0, limit = 4} = props;
    let _users1 = users.slice(0, limit - 1);
    let _users2 = users.slice(limit - 1);
    // console.log('______', limit,  _users1, _users2)
    let it = _users2.at(-1);

    return <div className='ib' style={{marginTop: (top || 0) + 'px', marginLeft: (left || 0) + 'px'}}>
        {/* {leng} */}
        {_users1.map((it, ind) => {
            let userId = it.userId || it.user;
            return (ind >= (limit)) ? null :
                <RenderUserMemorized it={it} ind={ind} userId={userId} size={size}></RenderUserMemorized>
        })}
        {it && _users2.length > 1 && <RenderUserMemorized
            forceName={'+' + _users2.length}
            forceTitle={_users2.map(getTitle).join('\n\n')}
            it={it} userId={it.userId || it._id}
            size={size}></RenderUserMemorized>}
        {it && _users2.length == 1 &&
            <RenderUserMemorized it={it} userId={it.userId || it._id} size={size}></RenderUserMemorized>}


    </div>
}

function RenderUser({forceTitle, forceName, size, ind, it, userId}) {

    let user = it;
    let sizePx = size + 'px'
    let sizePx25 = (size / 2.5).toFixed(1) + 'px'
    let sizePx2 = (size / 2).toFixed(1) + 'px'
    let sizePx22 = (size / 2.2).toFixed(1) + 'px'


    // let v = useActionData();

    return <div
        style={{
            background: it.color,
            fontWeight: 'bold',
            color: 'black',
            cursor: 'default',
            textAlign: 'center',
            // border: '1px solid grey',
            border: '.5px solid ' + (it.grade === 2 ? '#7a6fbe80' : '#dedede'),
            boxSizing: 'border-box',
            lineHeight: sizePx,
            position: 'relative',
            marginRight: '-' + sizePx25,
            fontSize: sizePx22,
            zIndex: (100 - ind),
            borderRadius: sizePx, width: sizePx, height: sizePx
        }}
        key={ind}
        className={'ib shadow'}
        title={forceTitle || getTitle(user)}>
        <div>{forceName || it._SN || '--'}</div>
    </div>
}

const RenderUserMemorized = React.memo(RenderUser, (p1, p2) => {
    return false
})

const Memo = React.memo(Layout2, (p1, p2) => {
    return false;
})
export {userGrades}
export default Memo
