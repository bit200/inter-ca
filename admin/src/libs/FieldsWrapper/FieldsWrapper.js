import React from 'react'
import ReactExtender from './../ReactExtender/ReactExtender';
//let {ReactExtender} = window.my;
import Input from './../Input/Input';
import Select from './../Select/Select';
import ImageUploader from './../ImageUploader/ImageUploader';
import Button from './../Button/Button';
import DeleteButton from './../DeleteButton/DeleteButton';
import AutoComplete from './../AutoComplete/AutoComplete';
import ParsePlainType from './../ParsePlainType/ParsePlainType';
import Textarea from './../Textarea/Textarea';
import m from './../m/m';
import Datepicker from "../Datepicker/Datepicker";
import DatePicker from "react-datepicker";
import FileUploader from "../FileUploader/FileUploader";
import Checkbox from "../Checkbox/Checkbox";
import SimpleArray from "./components/SimpleArray";

let _ = window._;
const $ = window.$;

window.Date.prototype.toODB = function () {

  function pad(number) {
    if (number < 10) {
      return '0' + number;
    }
    return number;
  }

  return this.getUTCFullYear() +
    '-' + pad(this.getUTCMonth() + 1) +
    '-' + pad(this.getUTCDate())
};

class FieldsWrapper extends ReactExtender {

  changeOrder(delta = 1) {
    // console.log('*........ ## change orderrrrrrrrrrrrr', this, this.props);
    this.props.changeOrder && this.props.changeOrder(delta, this.props.ch_index, this.props._key)
  }

  // onChange(value, key) {
  //
  //   this.props && this.props.onChange && this.props.onChange(value, key)
  // }

  render() {
    let {btn_add, title, fields, def_size, _this, ch_index, deep_fields = [], item = {}, is_deep, tt} = this.props;
    fields = _.map(fields, ParsePlainType)
    let input_count = 0;

    let insertWithIndex = (ind, fields) => {
      let arr = _this.getDeep(fields)
      arr.splice(ind, 0, {_type: 'text', value: ''});
      _this.setDeep(fields, arr)
    }
    let changeOrder = (delta, ch_index, _key, nd_fields) => {
      let items = this.props.item[_key]
      // if (delta > items.length) {
      //   delta = delta - items.length;
      // }
      items = _.sortBy(_.map(items, (item, ind) => {
        item.sort_ind = ind === ch_index ? ind + delta * 1.1 : ind;
        return item
      }), 'sort_ind')
      this.deepUpdate(nd_fields, items)
    }
    let is_childs = false;

    return (<div className={'row'}>
      {fields.map((it, index) => {
        if (!item) {
          return <div key={index}></div>;
        }
        let {key, date, links, wo_bottom, params, type = 'text', max_leng, min_leng, leng, url, aspectRatio, placeholder, name, label, component_name} = it;

        let arr = (key || '').split('.');
        let value = global.m.get_deep(item, (key || '').split('.'));

        let Component = m.get_component(component_name);
        let childs = it.childs;

        if (childs && childs.length) {
          type = 'childs';
          it.size = it.size || 12
        }

        if (it.component) {
          type = 'component'
        }
        if (it.component_name === 'file') {
          it.type = 'file'
          type = it.type;
          delete it.component;
          delete it.component_name;
        }
        let className = 'col-xs-' + (it.size || def_size || 6);


        let TheComponent = global[it.component] || it.component;
        window.t2 = this;

        let get_iframe_url = (url) => {
          return url.replace(/##(.+?)##/gi, (a, v, c) => {
            return v === 'domain' ? window.env.domain : this.props.item[v]
          })
        }
        let frame_url = type === 'iframe' ? get_iframe_url(it.value) : ''

        let {title, wo_ins} = it;
        // value && console.log('*........ ## value', it, value, item);
        return (<div key={index} className={it.className || ''}>
          {type !== 'childs' && <div className={className}>
            {label && (type !== 'text' && type !== 'number' && type !== 'textarea') && <small>{label}</small>}
            {type === 'iframe' && <div>
              <a href={frame_url} target="_blank">OPEN</a>
              <iframe height={it.height || 1000} src={frame_url}></iframe>
            </div>}

            {type === 'text' &&
            <Input
              links={links}
              autofocus={++input_count === 1}
              onEnter={() => {
                $('#btn_update').click()
              }}
              placeholder={placeholder || label}
              value={value} _key={key} title={name} onChange={(v, key) => this.onChange(v, key)}/>}

            {type === 'number' && <Input
              autofocus={++input_count === 1}
              onEnter={() => {
                $('#btn_update').click()
              }}
              placeholder={placeholder || label}
              type={"number"}
              value={value} _key={key} title={name} onChange={(v, key) => this.onChange(v, key)}/>}


            {type === 'checkbox' &&
            <Checkbox
              value={value} _key={key} title={name} onChange={(v, key) => this.onChange(v, key)}/>}
            {type === 'uploader' &&
            <ImageUploader
              src={value} url={url}
              preview_size={it.preview_size}
              forseAspectRatio={it.forseAspectRatio} aspectRatio={aspectRatio} label={label} placeholder={name || placeholder} onChange={(v) => {
              this.onChange((v || {}).url || v, key)
            }}/>}

            {type === 'autocomplete' &&
            <AutoComplete
              isMulti={it.isMulti}
              list={it.list}
              items={value}
              item={value}
              url={it.url}
              opts={it}
              isSelectOnly={it.isSelectOnly}
              post_url={it.post_url}
              get_url={it.get_url}
              placeholder={it.placeholder}
              // onChange={this.onChange.bind(this)}
              onChange={(v) => this.onChange(v, key)}
            />
            }

            {((type === 'datepicker') || (type === 'datepicker')) &&
            <DatePicker selected={value ? new Date(value) : null} onChange={(date) => {
              let cd = new Date(date).toODB();
              // console.log('*........ ## changeeeeeeeeeeeeee', cd, value, date);
              this.onChange(cd, key)
            }}/>
            }

            {type === 'year' &&
            <Select items={m.from_to(it.from || 1975, it.to || 2025)}></Select>
            }
            {type === 'file' &&
            <div>
              <FileUploader short={true} label={name} onChange={(response) => {
                this.onChange(response.url, key)
              }}/>
            </div>
            }
            {type === 'select' &&
            <div>
              <Select
                items={it.items}
                value={value} onChange={(v) => {
                // console.log('*........ ## changess', v, key);
                this.onChange(v, key)
              }}/>
            </div>}
            {type === 'textarea' &&
            <Textarea
              links={links}
              _key={key}
              leng={leng}
              max_leng={max_leng}
              min_leng={min_leng} value={value} title={name} placeholder={placeholder || label} onChange={this.onChange.bind(this)}></Textarea>}
            {type === 'component' &&
            <div>
              {TheComponent &&
              <TheComponent deep_fields={deep_fields.concat(ch_index)}
                            params={params}
                            ch_index={ch_index}
                            _key={key}
                            item={_this.state.item}
                            _key={key}
                            _this={_this}
                            value={value}
                            title={name}
                            changeOrder={(v, v1, v2, v3) => this.changeOrder(v, v1, v2, v3)}
                            onChange={this.onChange.bind(this)}></TheComponent>}
            </div>
            }
            {type === 'date' &&

            <input type={'date'} _key={key}
                   title={name}
                   onChange={(v) => {
                    // // console.log'*........ ## vvvvvvvvvvvv', v.target.value);
                     this.onChange(v.target.value)
                   }}></input>}
            {type === 'html' && <div>
              {/*<small>{key}</small>*/}
              <div dangerouslySetInnerHTML={{__html: date ? global.m.date_time(value) : value}}></div>
            </div>}
            {type === 'href' && <div>
              {/*<small>{key}</small>*/}
              <a href={value} >{value}</a>
            </div>}
            {type === 'pre' && <div>
              <small>{key}</small>
              <div className={"pre"}>{value}</div>
            </div>}
            {Component ? <Component onChange={this.onChange.bind(this)} item={item} _key={key}
                                    params={params}
                                    value={value}
                                    changeOrder={(v, v1, v2, v3) => this.changeOrder(v, v1, v2, v3)}
                                    emitToParent={this.props.emitToParent && this.props.emitToParent.bind(this)}></Component> : ''}
          </div>}

          {type === 'array' && <SimpleArray
            {...{fields, title, _this, deep_fields, btn_add, _key: key + '', item, it, input_count, links, onChange: this.onChange.bind(this)}}
          />}

          {type === 'childs' &&
          <div className={it.size ? ('bbb col-xs-' + it.size) : ''}>
            <div className={it.size ? ('row s3333') : ''}>
              <div className="col-xs-6 55">
                {title && <h2 className="pull-left">{title}</h2>}
                <small className="links mt25">
                  {(links || []).map((item, ind) => {
                    return (<a className='link_item' key={ind} href={item.href || item.url || item} >
                      {item.name || 'Link' + ind + ' '}
                    </a>)
                  })}
                </small>
              </div>
              {/*<div className="col-xs-4">*/}


              {/*{!it.is_force_title && <Input _this={_this} fields={deep_fields.concat(key + '_title')} placeholder={'Custom title H2 Tag'}/>}*/}

              {/*</div>*/}
              <div className="col-xs-6">
                <div className={(it.btn_class ? it.btn_class : 'pull-right') + ' mt10'}>

                  <Button disabled={false} color={it.color || 0} className={'btn-xs pull-right ' + (it.btn_class || '')} onClick={() => {
                    let fields = deep_fields.concat([key]);

                    m.log('.------------ **____this', _this, tt);
                    if (_this && _this.onPrePush && fields.length === 1 && fields[0] === 'items') {
                      _this.onPrePush(fields, (value) => {
                        on_next(value)
                      })
                    } else {
                      on_next({})
                    }

                    function on_next(value) {
                      _this.deepUpdate(fields, value, 'push')
                    }

                  }
                  }>+ {it.btn_add || btn_add || it.btn_add_name || 'Add'}</Button>
                  <Button disabled={false} color={it.color || 0} className={'btn-xs pull-right mr10 ' + (it.btn_class || '')} onClick={() => {
                    let fields = deep_fields.concat([key]);

                    m.log('.------------ **____this', _this, tt);

                    if (_this && _this.onPrePush && fields.length === 1 && fields[0] === 'items') {
                      // console.log('*........ ## pre pushhhhhhhhhhhhhh');
                      // console.log('*........ ## pre pushhhhhhhhhhhhhh');
                      // console.log('*........ ## pre pushhhhhhhhhhhhhh');
                      _this.onPrePush(fields, (value) => {
                        on_next(value)
                      })
                    } else {
                      on_next({})
                    }

                    function on_next(value) {
                      _this.deepUpdate(fields, value, 'unshift')
                    }

                  }
                  }>+ To Top</Button>
                </div>
              </div>
              <div className="col-xs-12">
                <hr/>
              </div>

              {type === 'childs' && (item[key] || []).map((_item, ind) => {
                let nd_fields = deep_fields.concat(key);
                let arr_inds = global.m.from_to(1, 1000)
                return (<div key={ind} className={'col-xs-12 88 ch_ch ' + (item[key].length == (ind + 1) ? 'last_ch' : '') + (wo_ins ? ' wo_ins' : '')}>
                  {/*<i*/}
                  <div className="div row">
                    <div className="col-xs-12">

                      {!wo_ins && <div className="pull-left">
                        <small className={'mr-5'}>#{ind + 1}</small>
                        <select value={ind + 1} onChange={(e, v, a) => {
                          if (e.target.value) {
                            changeOrder(+(e.target.value) - ind - 1, ind, key, nd_fields)
                          }
                        }}>
                          {/*<option value="0">*/}
                          {/*  -*/}
                          {/*</option>*/}
                          {(arr_inds || []).map((item, ind) => {
                            return (<option key={ind} value={item}>
                              {item}
                            </option>)
                          })}
                        </select>
                        <a className="ml5 mr10" onClick={(e) => {
                          insertWithIndex(ind, nd_fields)
                        }}>Ins BEFORE</a>
                        <a onClick={(e) => {
                          insertWithIndex(ind + 1, nd_fields)
                        }}>Ins AFTER</a>

                      </div>}

                      <DeleteButton onClick={() => {
                        if (_this.onPrePop && nd_fields.length === 1 && nd_fields[0] === 'items') {
                          let value = _this.getDeep(nd_fields.concat(ind))
                          _this.onPrePop(value, (value) => {
                            on_next(value)
                          })
                        } else {
                          on_next({})
                        }

                        function on_next() {
                          _this.deepUpdate(nd_fields, ind, 'pop')
                        }
                      }}>
                      </DeleteButton>
                    </div>
                  </div>
                  <FieldsWrapper
                    tt={555}
                    _this={_this}
                    item={_item}
                    fields={childs}
                    changeOrder={(delta, ch_index, _key) => {
                      changeOrder(delta, ch_index, _key, nd_fields)
                    }}
                    _key={key}
                    ch_index={ind}
                    deep_fields={nd_fields}
                  ></FieldsWrapper>
                </div>)
              })}


            </div>
          </div>}
        </div>)
      })}
    </div>)
  }

}

global.FieldsWrapper = FieldsWrapper;

export default FieldsWrapper
