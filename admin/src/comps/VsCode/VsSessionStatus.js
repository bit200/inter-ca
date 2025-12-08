import React, {useEffect, useState} from 'react';
import axios from "axios";


function VsSessionStatus(props) {
    //console.log('*........ ## ROOT RENDER', props);
    let {session, is_admin} = props;
    let [open, setOpen] = useState(true)
    let [items, setItems] = useState([])
    useEffect(() => {
        if (!session?.session_id) {
            setItems([])
            return
        }
        setItems([])
        reload()
        let interval = setInterval(() =>{
            reload()
        }, 500)
        return () => {
            clearInterval(interval)
        }
    }, [session?.session_id])

    function reload () {
        if (!session) {
            return;
        }

        axios.get(session.server_http + '/session_status', {params: {session_id: session?.session_id}})
            .then((r) => {
                setItems(r.data)
            }).catch(() => {
        })
    }


    // let v = useActionData();
    let cd0 = items[0]?.cd ||  0;
    return <div>
        <div onClick={() => {setOpen(!open)}}>
        Vs SEssion Status {items?.length}
        </div>
        {open && <div>
            {(items || []).map((it, ind) => {

                return (<div key={ind} title={is_admin ? JSON.stringify(it.details, null, 4) : ''}>
                    {((it.cd - cd0) / 1000).toFixed(1)} {it.status}
                </div>)
            })}


        </div>}
    </div>
}

export default VsSessionStatus
