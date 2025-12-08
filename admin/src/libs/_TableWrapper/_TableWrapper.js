import React from 'react';
import {Route, Link, withRouter, BrowserRouter as Router} from 'react-router-dom'
import Table from './../Table/Table'

let fields = [{}];
let edit_fields = [{}];
let create_fields = [{}];
let api_url = '';


class TableWrapper extends React.Component {

  constructor(props) {
    super(props);
  }

  render() {
    return <div>
      <Table
        onSelect={() => {
         //console.log('*........ ## on select');
        }}
        opts={{url: '/words', tabs: [{name: 'asdf', key: '_id'}, {name: 'value', key: 'value'}]}}>

      </Table>

    </div>
  }
}

global.TableWrapper = withRouter(TableWrapper)

export default global.TableWrapper;
