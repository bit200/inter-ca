// import React from 'react'
// // import Storage from "../Storage/Storage";
//
//
// class Select extends React.Component {
//
//   // constructor() {
//   //   this.super
//   // }
//   render() {
//     let {ls_key, fields, className, _this, title, items, select_it, selected, value, onChange, disabled, pub_key, pub_name} = this.props;
//     if (_this && fields) {
//       value = _this.getDeep(fields)
//     } else {
//       value = value || value == 0 ? value : selected || selected == 0 ? selected : '';
//     }
//     if (ls_key && !this.already_inited) {
//       this.already_inited = true;
//       let _value = Storage.get(ls_key);
//       if (value != _value && fields && _this) {
//         _this.setDeep(fields, _value)
//       }
//     }
//
//     return (<div className={className}>
//       {title && <small>{title}</small>}
//       <select
//         value={value}
//         disabled={disabled}
//         className="form-control" onChange={(e, d) => {
//         e = e.target;
//         window.e = e.target;
//         let value = e.options[e.selectedIndex].value;
//         let {ls_key, _this, fields} = this.props;
//         if (_this && fields) {
//           _this.deepUpdate(fields, value)
//         }
//         if (ls_key) {
//           Storage.set(ls_key, value)
//         }
//
//         onChange && onChange(value);
//         // this.props._this.onChange()
//
//       }}>
//         {select_it && <option disabled value={''}>Select it</option>}
//         {(items || []).map((item, ind) => {
//           let value = item ? item._id || item.value : item;
//           if (!value && typeof item !== 'object') {
//             value = item;
//           }
//           return (<option value={value == +value ? +value : value} key={ind}>{item ? item.name || item : item}</option>)
//         })}
//       </select>
//     </div>)
//   }
//
// }
//
// export default Select
