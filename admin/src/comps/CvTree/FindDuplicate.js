import React, { useState, useEffect } from 'react';
import _ from 'underscore';
import Smart from 'libs/Smart';
import {
  Link, Outlet
} from "react-router-dom";
import MyModal from 'libs/MyModal';
import { TreeDirect } from './Tree';


function Layout2(props) {
  let { item, items } = props;
  let [open, setOpen] = useState(false)
  let [item1, setItem1] = useState({});
  let [item2, setItem2] = useState({});
  let [active, setActive] = useState({});
  let [childs, setChilds] = useState([]);

 //console.log('*........ ## ROOT RENDER', props);

  function onSetChilds(it1, it2) {
    let childs = _.uniq([...it1.childs || [], ...it2.childs || []])

    let vv = childs.map(it => {
      return items.filter(item => item._id == it)[0]
    }).filter(it => it);
   //console.log('childs444', vv, childs, global.components, items)

    setChilds(vv)
    return vv;
  }
  // useEffect(() => {
  //   props.item && setItem1(props.item)
  // }, [(props.item || {})._id])

  function getActive() {
    active ??= {};
    return (active._id == (item1 || {})._id) || (active._id == (item2 || {})._id) ? active : item1 || item2
  }
  item1 = item1 || {};
  item2 = item2 || {};
  active = getActive()
  // let v = useActionData();
  return <><a
      onClick={() => {
    setItem1(props.item)
    setOpen(true)
  }}>{t('isDublicate')}?</a>
   

    <MyModal 
    size={'full'}
    isOpen={open} onClose={() => setOpen(false)}>
    <div className='row'>
      <div className='col-sm-12'>

        Окно поиска дубликотов
        <hr />
      </div>

      <div className='col-sm-4'>
        {item1._id} {item1.name}
        <TreeDirect onOpen={it => {
         //console.log("on open ")
          setItem1(it)
          onSetChilds(it, item2)

        }}></TreeDirect>
      </div>
      <div className='col-sm-4'>
        {item2._id} {item2.name}
        <TreeDirect onOpen={it => {
         //console.log("on open ")
          setItem2(it)
          onSetChilds(item1, it)
        }}></TreeDirect>
      </div>
      <div className='col-sm-4'>
        <button onClick={() => {
          item2 ??= {}
          item1 ??= {}

          let active = getActive()
          global.http.post('/combine-components', {
            otherId: active._id == (item1 || {})._id ? item2._id : item1._id,
            activeId: (active || {})._id,
            childs
          }).then(r => {
           //console.log("rrrrrr", r)
            window.location.reload()
          })
        }}>Объединить</button>
        {[{ it: item1 }, { it: item2 }].map((it, ind) => {
          it.it ??= {}
          return <div onClick={() => {
            setActive(it.it)
          }} className={active._id == it.it._id ? 'activeDuplicate' : ''}>#{ind + 1}: {(it.it || {}).name}</div>
        })}
        <hr />
        Новый чайлд:

        {childs.map((it, ind) => {
          return <div>#{it._id} {it.name}
            <Smart obj={it}
              items={[{ size: 12, type: 'select', key: 'status', defValue: 'active', items: ['active', 'unactive'] }]}
              onChange={(v) => {
                childs[ind] = { ...it };
                setChilds([...childs])
              }}
            ></Smart>
          </div>
        })}


      </div>



    </div>
    </MyModal>
  </>
}

export default Layout2
