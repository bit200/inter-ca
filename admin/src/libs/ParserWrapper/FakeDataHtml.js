import React from 'react'
import ReactExtender from './../ReactExtender/ReactExtender';
import http from './../http/http';
//let {ReactExtender} = window.my;

const FakeDataHtml = {
  get(cb) {
    http.get('/last_api_html', {})
      .then(r => {
        // console.log('........ ## rrrrrrrrr', r);
        cb(r)
      })
      .catch(e => {
       // console.log'........ ## eeeeee', e);
      })
  }

}

export default FakeDataHtml
