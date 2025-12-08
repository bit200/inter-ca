import React from 'react'
import ReactExtender from './../ReactExtender/ReactExtender';
//let {ReactExtender} = window.my;
let $ = window.$;

class AutoInput extends ReactExtender {

  render() {
    return (<div>
      <input ref="input" type="text" onKeyDown={e => {
        let value = e.target.value;
        let $el = e.target
        // console.log('........ ## eeee', value, $el);
        $el.style.width = getWidthOfInput() + 'px';

        function getWidthOfInput() {
          var tmp = document.createElement("span");
          tmp.className = "input-element tmp-element";
          tmp.innerHTML = $el.value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
          document.body.appendChild(tmp);
          var theWidth = tmp.getBoundingClientRect().width;
          document.body.removeChild(tmp);
          return theWidth;
        }

      }} />
    </div>)
  }

}

export default AutoInput
