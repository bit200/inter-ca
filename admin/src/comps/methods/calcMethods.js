import _ from 'underscore';
function getDeltaHours (it) {
    return (+it.delta_hours || 0) * ((+it.isDelta ? 1 : 0))
}


const r = {
    pubHours(v) {
        return v ? (v + 'h') : '-'
    },

    calcFront(vars_obj) {
        let obj = global.compObj || {};
        let it = obj[vars_obj._id]
        if (!it) {
            return;
        }
        // console.log("qqqqq calc front", vars_obj, it);


        let _it = vars_obj; //|| it.vars[key] || {};
        let hours = getDeltaHours(_it);


        // _.each(it.childs, (child_id, v) => {
        let child_id = vars_obj._id;

        function fn(_it, _child_id) {
            let _hours = 0;

            if (!_it || !_it.obj || !_it.obj[_child_id]) {
                return _hours;
            }
            let _obj = _it.obj[_child_id];
            if (!_obj.selected) {
                return _hours;
            }
            let {type} = _obj;

            _hours = getDeltaHours(_obj)

           //console.log("qqqqq calc calc", _obj, _hours);
            let count = getCount(_obj)

            if (type === 'fhours') {
                _hours += (+_obj.fhours || 0) * count
                // hours += _hours;
                // _obj._hours = _hours;
            } else if (type === 'custom') {

                // _hours += getDeltaHours(_obj.custom)//(+(_obj.custom || {}).delta_hours || 0)
               //console.log("qqqqq _hours", _hours, _obj);

                _.each(obj[_child_id].childs, (custom_child_id, ind) => {
                    let f_obj = _obj.custom;
                    let __hours = fn(f_obj, custom_child_id);
                    _hours += __hours * count;
                })


            } else {
                // hours =
                let child_obj = obj[_child_id] || {};
                child_obj.vars = child_obj.vars || {};
                child_obj.vars[type] = child_obj.vars[type] || {};
                let child_vars = child_obj.vars[type]
               //console.log("qqqqq _child_id!!!!!!!!!!!!!!", _it);

                _hours += (+child_vars.hours || 0) * count

                // hours += _hours;
            }
            _obj._hours = _hours //* getCount(_obj);

            return _hours;

        }


        let _hours = fn(_it, child_id)
        hours += _hours;
       
       //console.log("qqqqq calc c11333333333333333333333333", _hours, hours);

        _it.hours = hours;
        _it._hours = hours;
        // console.log("qqqqq value", _it, hours);
        return _it;

    },
    onChangePrice(item, cb) {
        // console.log("qqqqq on change price", item);
        global.http.put('/update-price', {item})
            .then(r => {
                // console.log("qqqqq price are updated", r);
                cb && cb(r)
            })
    }
}
function getCount (obj) {
    return obj.isCount ? +obj.count : 1
}


export const pubHours = r.pubHours;
export const onChangePrice = r.onChangePrice;
export const calcFront = r.calcFront;

export default r