import React from 'react'
import {Link} from 'react-router-dom'
import ReactExtender from './../ReactExtender/ReactExtender';

const {http, Spinner, FieldsWrapper, Hr, ConfirmModal, m, CloseButton, notify, Button} = global;
let _ = window._;

class ExtracterDetailed extends ReactExtender {

  constructor(props) {
    super(props);
    this.state = {item: props.item, isOpen: false};
    // this.state = {item: props.item};
    this._onUpdate = this.onUpdate.bind(this)
    global.t00 = this;


  }

  onRemove(item) {
    item.is_removed = true;
    this.props.onChange && this.props.onChange(item)
  }

  onUpdate(scb, ecb) {
    console.warn('*........ ## update herererererecr');
    let item = {...this.state.item};
    let {url, required, pre_save, post_save} = this.props.opts || {};
    item.is_new_el = !item._id

    let is_required;
    _.each(required, (it, ind) => {
      if (!item[it]) {
        is_required = true;
        notify.danger(m.capitalize_first_letter(it) + ' is a required field')
      }
    })
    if (is_required) {
      ecb && ecb()
      return;
    }

    if (pre_save) {
      item = pre_save(item);
    }


    // console.log('*........ ## we are almost here', item);

    http[item.is_new_el ? 'post' : 'put'](url, item)
      .then((v) => {
        // console.log('*........ ## done', v, this.props.onChange);
        this.props && this.props.onChange && this.props.onChange(_.extend(item, v))
        // console.log('*........ ## done step1');

        scb && scb()
        // console.log('*........ ## done step2');

        notify.success(`Successfully ${item.is_new_el ? 'Created' : 'Updated'}!`)
        // console.log('*........ ## done step3');

        m.hide_modal()
        // console.log('*........ ## done step4');

        post_save && post_save()
      })
      .catch((e) => {

        // console.log('*........ ## eeeeeeeeeeeeeeee', e);
        ecb && ecb()
      })
  }

  onChange(value, key) {

    let {item} = this.state;
    item[key] = value;
    this.setState({item})
    // console.log('*........ ## on chagneeeeeee', this.props, this.props.opts);
  }

  _onChange() {
    let {isDuplicated} = this.props.opts;
    if (!isDuplicated) {
      return;
    }
    let {item} = this.state;
    clearTimeout(this.timer);

    this.timer = setTimeout(() => {
      // console.log('*........ ## send duplicating request');
      this.setState({loading: true})
      http.post("/check_duplicates", item, {})
        .then(r => {
          this.setState({loading: false, duplicated_items: r.duplicated_items || []})
        })
        .catch(e => {
          this.setState({loading: false, duplicated_items: []})
        })
    }, 500)
  }

  componentWillReceiveProps(props) {
    let {item} = props;
    if (item && (!this.state.item || this.state.item._id !== item._id)) {
      this.setState({item: props.item}, () => {
        let {opts} = this.props;
        let {isDuplicated} = opts;
        if (isDuplicated) {
          this._onChange()
        }
      })
    }
  }

  componentDidMount() {

  }

  getName() {
    let {item = {}} = this.state;
    return !item._id ? 'Create' : 'Update'
  }

  render() {
    function pub_color (it, key) {
      let v = item[key];
      if (v && v.length > 2) {
        let reg = new RegExp(v, 'i')
        return (it || '').replace(reg, (...args) => {
          return `<b>${args[0]}</b>`
        });
      }
      return it;
    }
    let {opts} = this.props;
    let {isDuplicated} = opts;
    let {item = {}, duplicated_items = [], isOpen, loading} = this.state;
    let input_count = 0;

    let clName = isDuplicated
    return (<div className={'row ' + (opts.className || '')}>

      <div className={isDuplicated ? "col-xs-6" : 'col-xs-12'}>
        <Button
          id={"btn_update"}
          className={"pull-right"}
          onClick={this._onUpdate}>{this.getName()}</Button>
        <div className="row">


          {item.loading_details &&
          <div className="right-abs">
            <Spinner></Spinner></div>}
          {item.is_removed && <div className="col-xs-12">
            <small className="label label-danger">REMVOED</small>
            <Hr/>
          </div>}
          <div className="col-xs-12">
            {/*<div className="pull-right ib">*/}
            {/*  <Button*/}
            {/*    id={"btn_update"}*/}
            {/*    onClick={this._onUpdate}>{this.getName()}</Button>*/}
            {/*</div>*/}
            {/*<div className="col-xs-12">*/}
            {/*  <hr/></div>*/}
            <FieldsWrapper
              tt={4444}
              _this={this.props._this}
              item={item}
              deep_fields={['item']}
              def_size={opts.def_size}
              fields={opts.edit}
              onChange={() => this._onChange(item)}
            ></FieldsWrapper>
          </div>
        </div>
        <hr/>
        <ConfirmModal
          isOpen={isOpen}
          item={item}
          onSuccess={() => this.onRemove(item)}
          opts={opts}
        >
        </ConfirmModal>
        {item && item._id && <div className="pull-left">
          <Button color={1} onClick={(scb) => {
            this.setState({isOpen: true})
            scb()
          }}>{item.is_removed ? 'Restore' : 'Delete'} It</Button>
        </div>}
        <div className="pull-right">
          <div className="ib">
            <CloseButton></CloseButton>
          </div>
          <div className="ib hide-with-modal">
            {opts.back_url && <Link to={opts.back_url}><Button color={1}>Go Back</Button></Link>}
          </div>
          <div className="ib">
            <Button
              className={'btn-xs btn_update2'}
              id={"btn_update"}
              onClick={this._onUpdate}>{this.getName()}</Button>
          </div>

        </div>
        <div className="clearfix"></div>
      </div>
      {isDuplicated && <div className={"col-xs-6 " + (loading ? 'o5' : '')}>
        <h1 style={{fontSize: '20px'}}>Similar items finding</h1>
        <hr/>
        {/*cd: "2021-11-16T07:16:20.928Z"*/}
        {/*comment: "asdf"*/}
        {/*company_name: "asdf"*/}
        {/*contact_name: "32"*/}
        {/*crm_link: "asdf"*/}
        {/*email: "asdf"*/}
        {/*sales_name: "asdf"*/}
        {/*site: "asdf"*/}
        {/*stack: "asdf"*/}
        {/*summary: "contact"*/}
        {/*tg_phone_number: "asdf"*/}
        {/*tg_username: "asdf"*/}
        {/*ur_name: "asdf"*/}
        {/*user: 1005*/}
        {/*_id: 1000*/}

        <div style={{overflow: 'auto'}}>
        <table className="mt-10 table table-bordered table-striped my_table ">

          <thead>
          <tr>
            <th>Ссылка</th>
            <th>Конт Лицо</th>
            <th>Наз Комп</th>
            <th>ЦРМ</th>
            <th>Сайт</th>
            <th>Тел</th>
            <th>Юзер</th>
            <th>Емаил</th>
          </tr>
          </thead>
          <tbody>
          {(duplicated_items || []).map((item, ind) => {
            return (<tr key={ind}>

              <td>
                <div>
                <a target={'_blank'} href={`/admin/clients/${item._id}/detailed`}>{item._id}</a>
                </div>
              </td>
              {(['contact_name', 'company_name', 'crm_link', 'site', 'tg_phone_number', 'tg_username', 'email'] || []).map((it, ind) => {
                return (<td key={ind}>
                  <div dangerouslySetInnerHTML={{__html: pub_color(item[it], it)}}>
                  </div>
                </td>)
              })}
            </tr>)
          })}
          </tbody>
        </table></div>
        {!duplicated_items.length && <div>
          <div>We did not find similar items</div>
        </div>}
      </div>}
    </div>)
  }
}

export default ExtracterDetailed
