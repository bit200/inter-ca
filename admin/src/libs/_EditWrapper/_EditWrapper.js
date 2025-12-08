import React from 'react';
import {Route, Link, withRouter, BrowserRouter as Router} from 'react-router-dom'


let fields = [{}];
let edit_fields = [{}];
let create_fields = [{}];
let api_url = '';


class EditWrapper extends React.Component {

  constructor(props) {
    super(props);
  }

  render() {
    return <div className={'o'}>
     Edit Wrapper
    </div>
  }
}

global.EditWrapper = withRouter(EditWrapper)

export default global.EditWrapper;
