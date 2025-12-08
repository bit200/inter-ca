import m from './../m/m';
let _ = window._;
let $ = window.$;

const SIZES = {
  'Hr': 12
}
const ParsePlainType = function (it) {
  if (it && it.parsed) {
    return it;
  }
  if (typeof it === 'string') {
    let arr = it.split('#');
    let obj = {};

    let key = arr[0];
    let type = arr[1];
    let size = arr[2];
    let name = arr[3];

    if (!size && type == +type) {
      size = type;
      type = ''
    }

    let sreg = /\!/i;
    obj.special_type = sreg.test(key);
    key = key.replace(sreg, '');
    obj.key = key;
    obj.name = name || (_.map(key.split('_'), v => m.capitalize_first_letter(v))).join(' ');

    if (key === 'cd') {
      obj.name = 'cd'
      obj.type = 'date'
    }
    if (type && !/main_link|date|text|html|pre|textarea|datepicker|array|href_(.+?)/.test(type)) {
      obj.type = 'component';
      obj.component_name = type;
    }

    if (key === '_id') {
      obj.type = obj.type || 'main_link'
    } else if (key === 'cd') {
      obj.type = obj.type || 'date'
    }

    obj.type = obj.type || type || 'text';

    obj.size = +(size || SIZES[obj.component_name] || SIZES[obj.key] || SIZES[obj.type] || 6)


    obj.parsed = true;
    return obj;
  } else if (Array.isArray(it)) {
    return {
      name     : it[0],
      component: it[1],
      size     : it[2],
      parsed: true
    }
  } else if (it) {
    it.childs = _.map(it.childs, ParsePlainType);
    it.parsed = true;
    return it;
  } else {
    return {}
  }
}

export default ParsePlainType;
