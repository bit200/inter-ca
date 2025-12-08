import React from 'react'
import ReactExtender from './../ReactExtender/ReactExtender';
import Checkbox from './../Checkbox/Checkbox';

let _ = window._;
//let {ReactExtender} = window.my;

class Checkboxes extends ReactExtender {


  render() {
    let {items = [], selected_items = [], title, key} = this.props;
    return (<div>
      {title && <div>
        <small>{title}</small>
      </div>}
      {(items || []).map((item, ind) => {
        let _key = item ? item.key || item : item;
        let name = item ? item.name || item : item;
        let value = selected_items.indexOf(_key) > -1;
        return (<label key={ind} className={"ib mr-5"}>
          <Checkbox
            _key={_key}
            value={value}
            // title={name || key}
            onChange={(value, key) => {

             //console.log('........ ## ON CHANGE checkbox');
             //console.log('........ ## ON CHANGE checkbox');
             //console.log('........ ## ON CHANGE checkbox', value, key);
              if (value) {
               //console.log('........ ## TRUE');
                selected_items.push(key);
                selected_items = _.uniq(selected_items)
              } else {
               //console.log('........ ## FALSE');
                selected_items = _.filter(selected_items, it => it !== key)
              }
              selected_items = _.intersection(items, selected_items)
             //console.log('........ ## selected_items', selected_items, items);
              this.props.onChange && this.props.onChange(selected_items, key || 'selected_items', value)

            }}/>
        </label>)
      })}
    </div>)
  }

}

export default Checkboxes
