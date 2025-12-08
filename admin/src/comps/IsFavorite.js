import React, {useState} from "react";
let changeFavorite = Storage.changeFavorite;

function IsFavorite(props) {
    let [count, setCount] = useState(0);

    let {question, size} = props;
    global.historyObj = global.historyObj || {};

    let histObj = props.item || (global.historyObj || {})[question._id] || {};

    return <div className={'ib'} style={{marginRight: '5px'}} onClick={(e) => {
        histObj.isFavorite = !histObj.isFavorite;
        global.historyObj[question._id] = global.historyObj[question._id] || {};
        global.historyObj[question._id].isFavorite = histObj.isFavorite;


        changeFavorite(question, histObj.isFavorite, () => {
            setCount(new Date().getTime())
        });
        e.stopPropagation();
        return e.preventDefault();
    }}>
        <div className={"fa fa-star" + (!histObj.isFavorite ? '-o' : '')} style={{fontSize: (size || 15) + 'px'}}>
        </div>
    </div>
}

export default IsFavorite
