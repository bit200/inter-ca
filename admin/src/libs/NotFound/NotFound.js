import React from 'react'
import img500 from './500.png';
import img403 from './403.png';
import img404 from './404.png';
import MyImg from "../../comps/MyImg";

let img_obj = {img500, img403, img404};

class NotFound extends React.Component {

  render() {
    let {code = 404} = this.props;

    let img = img_obj['img' + code] || img_obj['img404']
    return <MyImg width={300} top={50} title={'nothingFound'}>404</MyImg>
  }

}

export default NotFound
