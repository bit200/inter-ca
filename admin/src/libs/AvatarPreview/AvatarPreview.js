import React from 'react'
import ReactExtender from './../ReactExtender/ReactExtender';
import user from './../user/user';
//let {ReactExtender} = window.my;

class AvatarPreview extends React.Component {

  rerender() {
    this.setState({cd: new Date().getTime()})
  }
  render() {
    let {width, height, src} = this.props;
    if (!src) {
      let info = user.get_info() || {};
      src = info.avatar;
    }
    return (<div className="avatar-preview" style={{width: width + 'px', height: width + 'px'}}>
      <img src={src} width={width} height={height}/>
    </div>)
  }

}

export default AvatarPreview
