import _ from 'underscore';
import obj from './lngs';
import Storage from './../Storage'
import ColorTheme from "../ColorTheme";
import {markTranslation, markValue, stripMarks} from './translateMarks';

function getParameterByName(name, url = window.location.href) {
    const regex = new RegExp(`[?&]${name}=([^&#]*)`);

    const results = regex.exec(url);

    return results ? decodeURIComponent(results[1].replace(/\+/g, ' ')) : null;
}


global.setLng = (lng) => {
    window.lng = lng;
    Storage.set('lng', lng)
    document.documentElement.setAttribute('data-lng', lng)
    document.title = nameFn('titleH1');
}

global.env.nameFn = (name) => {


    function toLower(v) {
        try {
            return (v || '').trim('').toLowerCase()
        } catch (e) {
            return v;
        }

    }

    _.each(obj, (item, ind) => {
        obj[toLower(ind)] = item
    })

    name = stripMarks(name)
    let _name = toLower(name)
    let fName = (obj[_name] || {})[lng] || ''

    return markTranslation(fName || name || '-', !!fName, isHttps)
}

// Перевод значения из данных: нет перевода — возвращает значение без меток.
global.env.valueFn = (value) => {
    if (value === undefined || value === null || value === '') return '-';
    if (typeof value !== 'string') return value;
    let clean = stripMarks(value);
    let found = obj[clean.trim().toLowerCase()] || obj[clean];
    return markValue(clean, (found || {})[lng] || '', isHttps)
}

global.nameFn = global.env.nameFn;
global.NameFn = global.env.nameFn;
global.t = global.nameFn;
global.T = global.nameFn;

const isHttps = window.location.href.indexOf('https://') > -1
const flngValue = getParameterByName('flng');
let isITKEDU = window.location.href.indexOf('itkedu.com') > -1;
window.lngs = isITKEDU ? ['en', 'es', 'fr', 'de'] : ['ru', 'en', 'es', 'fr', 'de']
setLng(flngValue || Storage.get('lng') || lngs[0])


/*

continue es (spain), de(germany), en(english), fr(Franch) to that object, franch place in  comma to keep JSON formatting (keep main key in commas "")





 */