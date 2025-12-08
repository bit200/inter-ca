import React from 'react'
import ExtracterDetailed from './ExtracterDetailed'

let _ = window._;
const {http, MyModal, ReactExtender, Table, WhiteWrapper, Wrapper, Button, m} = global;

class Extracter extends ReactExtender {
  constructor(props) {
    super(props);
    this.state = {};
    this.opts = this.props.opts;//m.getOpts(this.props.match.params.path);
    this.onChange = this.onChange.bind(this);
  }

  onAdd(it) {
    _.each(this.opts.secret_fields, field => {
      delete it[field]
    })
    it.loading_details = !!it._id;
    this.setState({item: it});
    this.modal.show()
    it._id && http.get(this.opts.url + '/' + it._id, {})
      .then(item => {
        it = _.extend(it, item, {loading_details: false});
        this.setState({item: it})
      })
  }

  onChange(it) {
    // console.log('*........ ## on change it', it);
    this.table && this.table.onChange && this.table.onChange(it)
  }


  render() {
    let item = this.state.item || {}
    let opts = this.opts || {};
    // let sub_id = this.props.match.params.sub_id;
    let sub_id = '';
    let {Table} = global;
    // console.log('*........ ## props', opts, item);

    return <div title={opts.title + (sub_id ? '  #' + sub_id : '')} title2={opts.title2}>
      <MyModal
        title={item._id || 'Создать запись'}
        link={item._id ? '/admin/' + (opts.pathname + '/' + item._id + '/detailed') : null}
        opts={opts}
        size={opts.modal_size}
        ref={(el) => this.modal = el}
      >
            <ExtracterDetailed
              _this={this}
              onChange={this.onChange}
              opts={opts}
              item={item}>
            </ExtracterDetailed>
      </MyModal>

      <Table
        sub_id={sub_id}
        onSelect={(it) => this.onAdd(it)}
        opts={this.opts}
        ref={el => this.table = el}
      >
      </Table>
    </div>
  }
}

global.Extracter = Extracter;

export default Extracter
