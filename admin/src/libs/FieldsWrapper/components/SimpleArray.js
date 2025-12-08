import React from 'react';
import Button from "../../Button/Button";
import DeleteButton from "../../DeleteButton/DeleteButton";
import Input from "../../Input/Input";
const $ = window.$;

const SimpleArray = ({fields, title, _this, deep_fields, btn_add, _key, item, it, input_count,links, onChange }) => {
  const key = _key;
  return (
    <div className={it.size ? ('bbb col-xs-' + it.size) : ''}>
      <div className={it.size ? ('row s3333') : ''}>
        <div className="col-xs-6 55">
          {title && <h2 className="pull-left">{title}</h2>}
        </div>
        <div className="col-xs-6">
          <div className={(it.btn_class ? it.btn_class : 'pull-right') + ' mt10'}>
            <Button disabled={false} color={it.color || 0} className={'btn-xs pull-right ' + (it.btn_class || '')}
                    onClick={() => {
                      let fields = deep_fields.concat([key]);
                      _this.deepUpdate(fields, '', 'push')
                    }}>+ {it.btn_add || btn_add || it.btn_add_name || 'Add'}</Button>
            <Button disabled={false} color={it.color || 0} className={'btn-xs pull-right mr10 ' + (it.btn_class || '')}
                    onClick={() => {

                        on_next('')
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

        {(item[key] || []).map((_item, ind) => {
          let nd_fields = deep_fields.concat(key);
          return (<div key={ind}
                       className={'col-xs-12 88 ch_ch ' + (item[key].length === (ind + 1) ? 'last_ch' : '') }>
            {/*<i*/}
            <div className="div row">
              <div className="col-xs-12">
                <div className="col-xs-11">
                  <Input
                    links={links}
                    autofocus={++input_count === 1}
                    onEnter={() => {
                      $('#btn_update').click()
                    }}
                    value={_item} _key={ind}  onChange={(v, ind) => onChange(v, key, ind)}/>
                </div>
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
          </div>)
        })}
      </div>
    </div>
  );
};

SimpleArray.propTypes = {

};

export default SimpleArray;
