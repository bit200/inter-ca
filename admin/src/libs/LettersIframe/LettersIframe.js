import React from 'react';
import {Route, Link, BrowserRouter as Router} from 'react-router-dom'
import AutoComplete from "../AutoComplete/AutoComplete";

class LettersIframe extends React.Component {

  constructor(props) {
    super(props);
  }

  render() {
    let {env} = global;
    // console.log('*........ ## env', env,this.props)
    let url = `${env.domain}/anim?_id=${this.props.item._id}`;
    return <div>Letters Iframe
      <a href={url} target="_blank">OPEN</a>
      <iframe height={3000} src={url} ></iframe>
    </div>

  }
}
global.LettersIframe = LettersIframe;


export default LettersIframe;
