import React from 'react';
import _ from 'underscore';
import Input from './../Input';
import Textarea from './../Textarea';
import Select from './../Select';
import Button from './../Button';
import Skeleton from './../Skeleton';
import ImageUploader from './../ImageUploader/ImageUploader';
import FileUploader from './../FileUploader/FileUploader';
import {ReactSortable} from "react-sortablejs";

import './smart.css';
// import {CKEditor} from '@ckeditor/ckeditor5-react';
// import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import MDEditorComp from '../../comps/Suggest/MDEditorComp';
import DatePicker from "../Datepicker/Datepicker";
import { Editor } from '@monaco-editor/react';
import NFN from "../../comps/i18/NFN";
import MdPreview from "../../comps/Suggest/MdPreview";

const SmartMemo = React.memo(function (props) {
    return <Smart {...props}></Smart>
}, (v1, v2) => {
   //console.log('SMART MEMEO', v1.memo, v2.memo, v2.name)
    return v1.memo == v2.memo;
})

// console.log('*........ ## Inp', Input);
let gkey = 0;
// import DatePicker from "react-datepicker";
class SortComp extends React.Component {
    render() {
        function smartUpdate(value) {
            let fn = onChangeFull || onChange
            fn([], key);
            setTimeout(() => {
                fn(value, key)
            })
        }

        let {
            defClass,
            filter,
            parentObj,
            onChangeFull,
            ind,
            key0,
            defSize,
            _key,
            value,
            item,
            each,
            field,
            onChange,
            onClick
        } = this.props;
        let key = key0;
        return (
            (!filter || filter(item)) ? <div className={'arr-item rel ' + field.defClass} onClick={() => {
                onClick && onClick(item, ind)
            }}>
                {/*<input type="text" value={item.xx} onChange={(e) => {*/}
                {/*  item.xx = e.target.value;*/}
                {/*  // console.log('*........ ## it', item, _key);*/}
                {/*  onChange(item, _key)*/}
                {/*}}/>*/}
                <div className={'drag-handle hov-item'} onClick={(e) => {
                    e.stopPropagation();
                    return true;
                }}>
                    <i className={'iconoir-line-space'}></i>
                </div>
                <Smart
                    parentObj={parentObj}
                    items={each}
                    ind={ind}
                    defClass={field.defClass || defClass}
                    defSize={field.defSize || defSize}
                    obj={item}
                    onChange={(_obj, value, field) => {
                        if (key) {
                            onChange(_obj, _key)
                        } else {
                            onChange(value, field)
                        }
                    }}
                ></Smart>


                <div className="iconoir-trash rem-icon hov-item" onClick={(e) => {
                    value = _.filter(value, (it, ind2) => {
                        return ind2 !== ind;
                    });
                    smartUpdate(value)
                }}></div>
            </div> : <div></div>)
    }
}

class Sort extends React.Component {
    render() {
        function smartUpdate(value) {
            let fn = onChangeFull || onChange
            fn([], key);
            setTimeout(() => {
                fn(value, key)
            })
        }

        let {Component} = this.props;
        let {
            defClass,
            filter,
            parentObj,
            onChangeFull,
            ind,
            defSize,
            key,
            key0,
            activeInd,
            _key,
            value,
            item,
            each,
            onClick,
            field,
            onChange
        } = this.props;
        key = key || key0
        value = value || [];
        this.arr = value;

        return <ReactSortable
            handle={".drag-handle"}
            animation={200}
            list={value || []}
            onEnd={(evt) => {
                value = this.arr;
              // console.log('aaab', evt)
                smartUpdate(value);
            }}

            setList={(value) => {
                this.arr = value;
            }}>
            {value.map((item, ind) => (
                <div key={'value_wrap' + '_' + ind}
                     onClick={(e) => {
                         // field.onClick && field.onClick(item, ind)
                     }} className={'row sort-item ' + (activeInd === ind ? 'active' : '')}>
                    <div className={'ib col-sm-12 draggable-cont'}>

                        <Component
                            {...this.props}
                            ind={ind}
                            filter={filter}
                            parentObj={parentObj}
                            defClass={defClass}
                            defSize={defSize}
                            key0={key}
                            _key={_key}
                            item={item}
                            activeInd={activeInd}
                            each={each}
                            onClick={onClick}
                            field={field}
                            value={value}
                            onChange={(_value, __key) => {
                              // console.log('*........ ## con !!change', value, __key, _value);
                                onChange(value, key)
                            }}
                            onChangeFull={(_value, __key) => {
                              // console.log('*........ ## con !!change', value, __key, _value);
                                onChange(_value, __key)
                            }}>

                        </Component>

                    </div>
                </div>
            ))}
        </ReactSortable>
    }
}

function prevent(e) {
    e.preventDefault();
    e.stopPropagation();
    return true;
}


class Smart extends React.Component {

    constructor(props) {
        super(props);
        // this.props.obj = this.props.obj || {}
        this.state = this.props;
    }

    componentWillReceiveProps(nextProps, nextContext) {
        this.setState(nextProps)
    }

    setDeep(item, value, key) {
        key = key || ''
        let keys = key.split('.');
        let it = item;
        let leng = keys.length;
        item = item || {}
        // console.log('*........ ## set deep ORIGNAL', keys, JSON.stringify(item, null, 2));

        _.each(keys, (key, index) => {
            let next_key = keys[index + 1];
            key = key == +key ? +key : key;
            let defValue = ((next_key == +next_key) ? [] : {});

            try {
                let vv = it[key]
            } catch (e) {
                it[key] = defValue
            }

            if (index === leng - 1) {
                it[key] = value
            } else {
                it[key] = it[key] || defValue
            }
            it = it[key];
        });

        // let first_key = keys[0];
        //
        // let obj = _.extend({}, item);
        //
        // obj[first_key] = item[first_key];
        // console.log('*........ ## set deep', keys, JSON.stringify(item, null, 2), value);
        return item;
    }
    onChangeMemo(field) {
        // console.log("field", field)
        return () => {
           setMemoValue(field.memoKey)
        }
    }

    onChange(v, key) {
        let {obj} = this.state;
        let {onChange} = this.props;
        obj = obj || {}
        obj = this.setDeep(obj, v, key);
        // this.props.onChange && this.props.onChange(v, key);
        // if (field.memoKey) {
        //     this.onChangeMemo()
        // }
        // console.log("on changeeeeee", onChange)
        // obj[key] = v;
      // console.log('*........ ## ovvvv', obj, v, key);
        onChange && onChange(obj, v, key)

        if (this.props.triggerSave) {
            this.setState({cd: new Date()})
        }
        // this.setState({obj})
    }

    render() {
        // console.log('*........ ## smart', this.state);
        let {items, customData, obj, isLoading, reactLoading, defSize = 3, Component, _key, defClass = ''} = this.state;
        let {parentObj, isMemo, classFn, btnSize} = this.props

        parentObj = parentObj || obj || {};



        obj = obj || {}
        // console.log("qqqqq itememememememmeme 1.0", classFn, defClass, this.props, this.state);

        // console.log("memo FN 1.0", this.props)
        return <div className={'row ' + defClass + (isLoading ? ' loading' : ' ')}>
            {(items || []).map((field, ind) => {
                if (!field) {
                    return null
                }
                let {
                    key, sortable, Component,
                    type, size, childs, each,
                    btns,
                    HR,
                    addName,
                    tabs,
                    defValue,
                    name,
                    path,
                    filter,
                    activeInd,
                    onClick,
                    _props,
                    isVisible,
                    memoKey,
                    memoFn,
                    memoKeys,
                } = field;
                memoKey = memoFn ? memoFn(field, this.props) : memoKey;
                type = type || (HR || btns || path || Component || childs || each ? type : 'input');
                let value = (obj || {})[key];
                if ((key || '').indexOf('.') > -1) {
                    let arr = key.split('.');
                    let it = obj;
                    let leng = arr.length;
                    _.each(arr, (key, index) => {
                        it = it ? it[key] : index === leng - 1 ? null : null;
                    });
                    value = it
                }
                size = size || defSize;
                let _this = this;

                let filterdArr = value;
                if (each && field.filter) {
                    filterdArr = (value || []).filter(field.filter)
                }

                let _isVisible = isVisible ? isVisible(obj, {field, value, obj, _key}) : true;
                // let memoFn =
                // console.log("memo FN 2.0", field)

               //console.log("qqqqq fieldddddddddddddd", field);
                if (!_isVisible) {
                    return <></>
                }

                if (tabs) {
                    let activeTabInd = _this.state.activeTabInd || tabs.findIndex(it => it);
                    let Footer = field.Footer;
                    let childs = tabs[activeTabInd]?.childs;
                    return <>
                        <ul className="nav nav-tabs w100" role="tablist">
                            {(tabs || []).map((tab, ind) => {
                                let isActive = activeTabInd == ind;
                                if (!tab) {
                                    return null
                                }
                                return (<li className="nav-item" role="presentation" key={ind}>
                                    <a className={"nav-link " + (isActive ? 'active' : '')}
                                       onClick={() => {this.setState({activeTabInd: ind})}}
                                       data-bs-toggle="tab"
                                      role="tab"
                                       aria-selected="true">{tab.name || '-'}</a>
                                </li>)
                            })}
                            {Footer && <li className="nav-item" role="presentation" style={{marginLeft: 'auto', order: '2'}}>

                                <Footer />
                            </li>}

                        </ul>
                        <div className={'fadeCh'} style={{marginTop: '10px'}}>
                            <Smart
                                onClick={(e) => {
                                    onClick && onClick()
                                }}
                                items={childs}
                                ind={ind}
                                parentObj={parentObj}
                                defClass={field.defClass || defClass}
                                defSize={field.defSize || defSize}
                                // classFn={field.classFn}
                                obj={key ? value || {} : obj}
                                onChange={(_obj, value, field) => {
                                    if (key) {
                                        this.onChange(_obj, key)
                                    } else if (field) {
                                        this.onChange(value, field)
                                    } else {
                                        // this.onChange
                                        this.props.onChange && this.props.onChange(_obj)
                                    }
                                }}
                            ></Smart>
                        </div>
                    </>
                }
                const FN = (props) => {
                    return (<div _key={ind} className={'col-sm-' + size}
                                 onClick={(e) => {
                                     // onClick && onClick({field, value, obj, _key});
                                     e.preventDefault();
                                     e.stopPropagation();
                                     return null
                                 }}>
                        {type === 'group' && <div className={'ib'}>
                            {(field.name || field.label) && <div><small><NFN>{field.name || field.label}</NFN></small></div>}
                            {(field.list || []).map((it, ind) => {
                                let {btnSize} = it;
                                let key = it.value ? it.value : it.key || it.key === 'false' || it.key == '0' || it.key == 0 ? it.key : it.name || it;
                                let _name = it.name || it.key || it || '---';
                                let {isMulti} = field
                                let CValue = isMulti ? (value || {})[key] : value;
                                let isSelected = CValue ? JSON.stringify(CValue) == JSON.stringify(key) : ind === 0;
                   let _value = it.value || it.key || it;
                   return (<button key={'btns-' + ind}
                                   className={`btn btn-${field.btnSize || 'sm'} btn-default ` + (isSelected ? 'active btn-primary' : '')}
                                   onClick={() => {
                                       this.onChange(isMulti ? {...{}, ...value || {}, [_value]: !isSelected}: _value, field.key)
                                   }}>
                       {it.icon && <i className={it.icon}></i>}
                       {t(_name)}
                       {/*<pre>{JSON.stringify(key, null, 2)} == {JSON.stringify(value, null, 2)} {isSelected ? 'true' : 'false'}</pre>*/}
                   </button>)
               })}
           </div>}
           {type === 'Skeleton' && <Skeleton/>}
           {type === 'md' && <>
               {name && <small>{window.nameFn(name)}</small>}
               <MDEditorComp
                   value={value} height={field.height}
                   opts={field}
                   defClass={field.defClass} onChange={(v) => {
                   this.onChange(v, key)
               }}></MDEditorComp></>}
           {type === 'imgUploader' && <ImageUploader item={parentObj} onChange={this.onChange}></ImageUploader>}
           {type === 'mdPreview' && <>
               {field.name && <div><small>{nameFn(field.key || field.name || '')}</small></div>}
               <MdPreview source={value}>{value}</MdPreview>
           </>}
           {type === 'skip' && <div
               className={field.defClass || ''}> </div>}
           {type === 'fileUploader' && <FileUploader item={parentObj}>File Uploader</FileUploader>}
           {type === 'text' && !field.isJSON && <div
               className={field.defClass || ''}>
               {field.name && <div><small>{nameFn(field.name)}</small></div>}
               {field.prefix || ''}{nameFn(value || field.value || defValue || '-')}{field.postfix || ''}</div>}
                        {type === 'text' && field.isJSON && <pre
                            className={field.defClass || ''}>{JSON.stringify(value, null, 4)}</pre>}
           {/input|number|checkbox/gi.test(type) && <Input
               // key={++gkey}
               label={field.label || field.name || name || type}
               value={value}
               type={type}
               woLabel={field.woLabel}
               className={field.className || field.defClass}
               placeholder={name || field.label || field.name || type}
               onChange={(v) => {
                   
                    field.onChange && field.onChange(v, key);
                    this.onChange(v, key)


               }}/>}
                {/date/gi.test(type) && <>
                    <DatePicker
                        label={field.label || field.name}
                        value={value}
                        type={"date"}
                        woLabel={field.woLabel}
                        className={field.className || field.defClass}
                        placeholder={name}
                        onChange={(v) => {
                            if (new Date(v).getTime() > 0) {
                                this.onChange(v, key)
                            }
                        }}/>
                    {/*<DatePicker*/}
                    {/*    */}
                    {/*    selected={value ? new Date(value) : null} onChange={(date) => {*/}
                    {/*    let cd = new Date(date).toODB();*/}
                    {/*    // console.log('*........ ## changeeeeeeeeeeeeee', cd, value, date);*/}
                    {/*    this.onChange(cd, key)*/}
                    {/*}}/>*/}
                </>}
           {type === 'textarea' && <Textarea
               label={t(field.label || field.name)}
               value={value}
               _opts={field}
               defClass={defClass}
               onChange={(v) => {
                   this.onChange(v, key)
               }}/>}
           {/*{type === 'editor' && <CKEditor*/}
           {/*    editor={ClassicEditor}*/}
           {/*    data={value || ''}*/}
           {/*    config={{toolbar: ['bold', 'italic', 'link', 'undo', 'redo', 'numberedList', 'bulletedList', "insertTable", "tableColumn", "tableRow", "mergeTableCells"]}}*/}
           {/*    onChange={(event, editor) => {*/}
           {/*        const data = editor.getData();*/}
           {/*        // console.log( { event, editor, data } );*/}
           {/*        this.onChange(data, key)*/}
           {/*    }}*/}

           {/*/>}*/}

           {Component && <div><Component
               // {...this.state}
               // tt={true}
               customData={this.props.customData}
               onChange={this.props.onChange}
               item={parentObj}
               localItem={obj || {}}
               httpSaveFn={this.props.httpSaveFn}
               ind={this.props.ind}
               resetMemo={this.onChangeMemo(field)}
               autoSaveFn={this.props.autoSaveFn}
               field={field}
               value={value}/></div>}
           {path && <div>
               {global.Loader(path)({
                   field,
                   item: parentObj,
                   _props,
                   ind: this.props.ind,
                   value: value,
                   customData: this.props.customData,

                   localItem: obj || {},
                   autoSaveFn: this.props.autoSaveFn,
                   onGlobalChange: (v) => {
                     // console.log("qqqqq on GLOBAL CHANGE",);
                       this.props.onChange && this.props.onChange(v)
                   },
                   onChange: this.onChange.bind(this)
               })}
           </div>}
           {type === 'select' && <Select
               title={field.label || field.name || field.title}
               value={value}
               items={field.items}
               onChange={(v) => {
                   this.onChange(v, key)
               }}>
           </Select>}

           {childs && childs.length && <div className={field.classFn ? field.classFn(obj) : ''}><Smart
               onClick={(e) => {
                   onClick && onClick()
               }}
               items={childs}
               ind={ind}
               parentObj={parentObj}
               defClass={field.defClass || defClass}
               defSize={field.defSize || defSize}
               // classFn={field.classFn}
               obj={key ? value || {} : obj}
               onChange={(_obj, value, field) => {
                   if (key) {
                       this.onChange(_obj, key)
                   } else if (field) {
                       this.onChange(value, field)
                   } else {
                       // this.onChange
                       this.props.onChange && this.props.onChange(_obj)
                   }
                   // console.log('*........ ## on Change@@!!!!~~~', obj, field, value);
                   //
               }}
           ></Smart></div>}
           {(!!HR || (type === 'HR')) && <div className={field.defClass}>
               <hr/>
           </div>}
           {each && each.length && <div className={field.defClass + ' list-parent-wrap'}>
               {((!field.woAdd && filterdArr && field.showTopAdd) || (field.woBottom || !filterdArr?.length)) &&
                   <div className={'btn-push-wrap btn-push-wrap-top'}>
                       <button className={'btn btn-xs btn-light btn-push-add'}
                           // style={{width: '100%'}}
                           // style={{right: 0}
                               onClick={(e) => {
                                   value = value || [];
                                   value.unshift({});
                                   this.onChange(value, key)

                                   return prevent(e);
                               }}>{addName || '+ Add item'}
                       </button>
                   </div>}
               {(!filterdArr || !filterdArr.length) && <div className={'tc nothing-found'}>

                   {!field.woImg && <img src="/st/404.svg" alt="" className={'404 svg'}/>}
                   <div className={'notFoundField'}>

                   {field.notFoundText || 'Ничего не найдено ...'}
                   </div>

               </div>}
               {!!sortable && <Sort
                   {...field}
                   items={value}
                   filter={filter}
                   Component={SortComp}
                   parentObj={parentObj}
                   ind={ind}
                   defClass={defClass}
                   defSize={defSize}
                   key0={key}
                   _key={_key}
                   each={each}
                   field={field}
                   value={value}
                   activeInd={activeInd}
                   onClick={onClick}
                   onChange={(items) => {
                     // console.log('*............ ## con chang22222', items, key);
                       this.onChange(items, key)
                   }}></Sort>}
               {/*<hr/>*/}


               {!sortable && (value || []).map((item, ind) => {
                   let _key = key + '.' + ind;

                   return <div key={ind}><SortComp
                       {...field}
                       ind={ind}
                       filter={filter}
                       defClass={defClass}
                       defSize={defSize}
                       key0={key}
                       _key={_key}
                       activeInd={activeInd}
                       parentObj={parentObj}
                       value={value}
                       item={item}
                       each={each}
                       onClick={onClick}
                       field={field}
                       onChange={(value, __key) => {
                         // console.log('*.............. ## con chang44444', value, __key, key);
                           this.onChange(value, __key || key)
                       }}
                   ></SortComp></div>

               })}
               {!field.woAdd && !field.woBottom &&  !!filterdArr?.length &&
                   <div className={'btn-push-wrap'}>
                       <button className={'btn btn-xs btn-light btn-push-add'}
                           // style={{width: '100%'}}
                           // style={{right: 0}
                               onClick={(e) => {
                                   value = value || [];
                                   value.push({});
                                   this.onChange(value, key)

                                   return prevent(e);
                               }}>{addName || '+ Add item'}
                       </button>
                   </div>}

           </div>}

           {type === 'btn' && <Button
               className={field.className}
               icon={field.icon}
               onClick={(e, a) => {
               if (field.onClick) {

                   field.onClick({
                       item: obj, onChange: (value, key) => {
                           this.onChange(value, key)
                       }
                   }, e, a)
               }
               e && e();

               e.preventDefault();
               e.stopPropagation();
               return null;

           }}>
               {field.name}
           </Button>}
           {btns && btns.length && (btns || []).map((field, ind) => {
             // console.log("qqqqq fielddddd", field);
               return (<Button
                   {...field}
                   onClick={(e, a) => {
                       if (field.onClick) {
                           field.onClick(obj, e, a)
                       }
                       e && e();
                       // e.preventDefault();
                       // e.stopPropagation();
                       return null;
                   }}

               >
                   {field.name}
               </Button>)
           })}


       </div>)
                }
                if (memoKey) {
                    // console.log('MEMO GOGOGOOGGO FN', memoKey)
                    return <DD FN={FN} memoKey={memoKey} memoValue={getMemoValue(memoKey)}></DD>
                }
                return FN()

            
            })}
        </div>
    }
}


let memo = {}
function getMemoValue(key) {
    return memo[key] || 0;
}
function setMemoValue(field) {
    memo[field] = getMemoValue(field) + 1
}
global.resetMemo = setMemoValue;

const DD = React.memo(function ({FN}) {
    // console.log("MEMO RENDRER >>>>>>>>>>>>>>>>> ")
    return FN()
}, (v1, v2) => {
    let memoValue1 = v1.memoValue
    let memoValue2 = v2.memoValue;
   //console.log('MEMO FNNNNNNNNNNNNNN----', {v1, v2, memoValue1, memoValue2})
    return memoValue1 == memoValue2;
});
global.memo = memo;

export default Smart
