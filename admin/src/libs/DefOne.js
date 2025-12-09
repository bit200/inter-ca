import React, {useEffect, useState} from 'react';
import _ from 'underscore';
import Smart from './Smart';
import Table from './Table';
import Input from './Input';

import {
    Link
} from "react-router-dom";

let timer;
let _timer;
let prevGetter = {};
let CD = new Date().getTime();
let prevHref;

function timerFN() {
    return new Date().getTime() - CD;
}

function getter(opts, cb) {
    let url = window.location.pathname.split('/')
    let path = url[url.length - 2];
    let _id = url[url.length - 1]
    let __url = '/' + (opts.url || path) + '/' + _id;
    // console.log("qqqqq GETTERRRRRRRRRRRRRRRRRRRRRRRRRRR 1.0", __url);
    //
    if (prevGetter.url === __url && prevGetter.r) {
        // console.log("qqqqq GETTERRRRRRRRRRRRRRRRRRRRRRRRRRR 1.5", prevGetter.r);
        return cb && cb(prevGetter.r);
    }
    // console.log("qqqqq GETTERRRRRRRRRRRRRRRRRRRRRRRRRRR 2.0", __url);

    // prevGetter = {url: __url}
    global.http.get(__url)
        .then((r) => {
            // prevGetter.r = r;
            cb && cb(r)
        })
        .catch(e => {
            // console.log("qqqqqeeeeee",);
        })
}

function ProjectDetailsWrap(props) {
    // console.log('xxxxx')
    return <div>
        <ProjectDetailsWrapMemo {...props}></ProjectDetailsWrapMemo>
    </div>
}

const ProjectDetailsWrapMemo = ((props) => {
    // console.log('Rendering MyComponent...');
    alert('ok')
    return <ProjectDetails {...props}></ProjectDetails>
}, (props) => {
    let href = window.location.href;

    let isRender = href !== prevHref;
    prevHref = href;
    // console.log("PREV NEXT", timerFN(), isRender)

    return isRender;
});


function ProjectDetails(params) {
    const [obj, setObjWrapped] = useState(null);
    const [count, setCount] = useState(0);

    function setObj(data, key) {
        setObjWrapped(data)
    }


    useEffect(() => {
        params?.props?.useEffect && params?.props?.useEffect(() => {
            setCount(+count + 1)
        })
    }, []);
    // const pub_link = () => {
    //     let arr = window.location.pathname.split('/');
    //     arr.pop();
    //     return arr.join('/')
    // }

    const autoSaveFn = (_obj) => {
        // console.log("asdfasdfasfd", _obj)
        _obj && setObj({..._obj})
        clearTimeout(timer)
        timer = setTimeout(() => {
            httpSave(_obj)
        }, props.autoSave == +props.autoSave ? +props.autoSave : 200)
    }

    window.autoSaveFn = autoSaveFn;
    window.globalItem = obj;
    window.onGlobalChange = (_obj, params) => {
        // console.log("qqqqq paramsssssssssssssssss", params);
        params = params || {}
        setObj({..._obj})
        !params.woHttp && httpSave(_obj)
    };

    const httpSave = (_obj) => {
        global.http.put(url, {item: _obj || obj})
            .then()
    }

    const httpSaveFn = (_obj, delay) => {
        clearTimeout(_timer)
        _timer = setTimeout(() => {
            httpSave(_obj)
        }, delay || 200)
    }


    // props = props.props || props;
    let {props} = params || {}
    let url = props.url;

    useEffect(() => {
        setObj({reactLoading: true})
        getter({url}, (v) => {
            // console.log("qqqqq GETTER VVVVVV", v, timerFN());
            setObj({...v})
        });
    }, [])

    // if (!obj) {
    //    // console.log"qqqqq gettergettergettergettergetter 0.0", obj, timerFN());
    //     setObj({reactLoading: true})
    //     getter({url}, (v) => {
    //        // console.log"qqqqq GETTER VVVVVV", v,timerFN());
    //         setObj({...v})
    //     });
    // }


    let opts = (props || {}).opts || props
    let BTN_SAVE = {
        btns: [{
            name: t('save'),
            icon: 'iconoir-double-check',
            minWidth: '120px',
            onClick: (e) => {
                // console.log('*........ ## bbb', e);
                global.http.put(url, {item: e})
                    .then(r => {
                        // console.log("qqqqq saved", props.refreshOnSave, params);
                        props.refreshOnSave && global.UpdateRootFn && global.UpdateRootFn();
                        //setCount(new Date().getTime())

                    })
                    .catch(e => {
                        // console.log("qqqqqasdfasdf", e);
                    })
            }
        }
        ]
    };
    if (!obj || (obj && obj.reactLoading)) {
        return <div></div>;
    }
    // console.log("qqqqq GETTERRRRRRRRRRR RELOAD", timerFN(), obj, prevGetter);

    return  <div className="card">
                <div className="card-body">
                    <div className={'row justify-content-center'}>
                        <div className="col-12 ">

                            <div className="pull-right zSMax">

                                <a
                                    style={{marginRight: '10px'}}
                                    onClick={() => {
                                    global.navigate(-1)
                                }} className={'btn-light btn pull-left'}>
                                    <i className="iconoir-undo"></i>
                                    {t('back')}
                                </a>
                                <div style={{display: 'inline-block', marginLeft: '-10px', paddingLeft: '5px'}}>
                                <Smart
                                    _this={this}
                                    defSize={12}
                                    autoSaveFn={autoSaveFn}
                                    httpSaveFn={httpSaveFn}
                                    defClass={props.defClass}
                                    items={[
                                        BTN_SAVE
                                    ]}
                                    obj={obj}
                                    onChange={(obj, field, value) => {
                                        setObj(obj, 'smart1')
                                        setCount(+count + 1)
                                        props.autoSave && autoSaveFn()
                                    }}></Smart>
                                </div>
                            </div>
                        </div>
                        <div className="col-12">
                            <Smart
                                _this={this}
                                defSize={2}
                                autoSaveFn={autoSaveFn}
                                httpSaveFn={httpSaveFn}
                                defClass={props.defClass}
                                items={[].concat(opts.edit, [
                                    {HR: true, size: 12},
                                    BTN_SAVE
                                ])}
                                obj={obj}
                                onChange={(obj, field, value) => {
                                    setObj(obj, {key: 'smart2', field, value})
                                    setCount(+count + 1)
                                    props.autoSave && autoSaveFn()
                                }}></Smart>
                        </div>
                    </div>
                </div>
            </div>

}

export default ProjectDetails
