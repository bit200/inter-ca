import React, {useState} from 'react';
import MyModal from "../libs/MyModal";

let scb

function Layout2(props) {
    //console.log('*........ ## ROOT RENDER', props);

    let [opts, setOpts] = useState({})
    let [open, setOpen] = useState(false)

    window.onConfirm = (opts, _scb) => {
        setOpen(true)
        setOpts(opts)
        scb = _scb
    }
    // let v = useActionData();
    opts = opts || {}
    return <div>
        <MyModal
            size={'small'}
            isOpen={open}
            onClose={() => setOpen(false)}
        >
            <h4>{opts.title|| opts.name || t('confirmAction')}</h4>
            <hr/>
            {opts?.desc && <>
                {<div>{opts?.desc}</div>}
                <hr/>
            </>}
            <div className="tr">
                <button className={'btn btn-sm btn-light'}
                        onClick={() => {
                            setOpen(false)
                        }}
                >
                    <i className="iconoir-xmark"></i>
                    {opts.no || t('cancel')}</button>
                <button className={'btn btn-sm btn-primary'}
                        onClick={() => {
                            setOpen(false)
                            opts.cb && opts.cb();
                            scb && scb();
                        }}
                >
                    <i className="iconoir-double-check"></i>
                    {opts.yes || t('confirm')}</button>
            </div>
        </MyModal>
    </div>
}

export default Layout2
