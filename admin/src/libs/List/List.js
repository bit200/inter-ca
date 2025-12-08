import React from 'react'
import ReactExtender from './../ReactExtender/ReactExtender';
import FieldsWrapper from './../FieldsWrapper/FieldsWrapper';

//let {ReactExtender} = window.my;

class List extends ReactExtender {

  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    let { color, btn_add, component, btn_class, childs, item, _this, deep_fields} = this.props;
    let cur_fields = deep_fields.slice(0, deep_fields.length - 1);

    item = item || _this.getDeep(cur_fields)
    let fields = [{
      key   : deep_fields.slice(-1)[0],
      btn_add,
      btn_class,
      color,
      childs: childs ? childs : [{
        component: component ,
      }]
    }];

    return (<div>
      <FieldsWrapper
        tt={111}
        _this={_this}
        item={item}
        deep_fields={cur_fields}
        fields={fields}
      ></FieldsWrapper>
    </div>)
  }

}

export default List
