import React from 'react';
// import Select from '@components/Select';
// import CreatableSelect from "react-select/creatable/dist/react-select.esm";
import http from './../http/http';
import m from './../m/m';
import './AutoComplete.css'

let {_} = global;

class AutoComplete extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      options: [],
      value  : []
    };
    this.post_url = this.props.post_url || this.props.url;//'/skills'
    this.get_url = this.props.get_url || this.props.url;
    this.items = this.props.items || [];
    this.list = this.props.list || [];
    this.item = this.props.item || [];
    this.isMulti = this.props.isMulti;

    this.get_options();

  }


  componentWillUnmount() {
    this.__isMounted = false;
  }

  componentDidMount() {
    this.__isMounted = true;
  }

  componentWillReceiveProps(nextprops) {

    this.list = nextprops.list;
    this.__isMounted && this.list && setTimeout(() => {
      this.list && this.list.length && this.get_options()
    })

  }

  get_label_key() {
    return this.props.label_key || (this.props.opts || {}).label_key || 'label';
  }

  pre_load_item(item) {
    let key = this.get_label_key()
    return {
      label: item[key],
      value: item._id || item.value || item.name_eng || item.name_ru || item.name
    }
  }

  get_options() {
    let _this = this;

    if (this.list && this.list.length) {
      this.list = _.map(this.list, it => {
        return typeof it === 'string' ? {label: it, value: it} : this.pre_load_item(it);
      })
      next(this.list)

      return;
    }
    this.get_url && http.get(this.get_url, {})
        .then((options) => {
          let items = _.map(options.items || options.data || options, (it) => {
            return this.pre_load_item(it)
          });

          next(items)

        })
        .catch(e => {
          // console.log('*........ ## eeeeeeeeeeeeee', e);
        })

    function next(items) {
      _this.list = items;
      let _items = (_this.props.items || []);
      let value = _.filter(items, it => {
        return _this.isMulti ? _items.indexOf(it.value) > -1 : _this.props.item === it.value;
      })

      _this.__isMounted && _this.setState({
        value,
        options: items
      })
    }
  }

  handleChange = (newValue, actionMeta = {}) => {
    console.group('Value Changed');
   //console.log(newValue);
    let {action} = actionMeta;
    let {props, isMulti} = this;


    let _this = this;
    // console.log(`action: ${actionMeta.action}`, action);
    if (action === 'create-option') {
      let value = this.isMulti ? newValue[newValue.length - 1] : newValue;
      if (this.post_url) {

        let query = {};
        let key = this.get_label_key();
        query[key] = value.label;

        http.post(this.post_url, query)
            .then((data) => {

              let item = this.pre_load_item(data);
              // console.log('*........ ## value', value, item, newValue);

              if (this.isMulti) {
                newValue = newValue.slice(0, newValue.length - 1).concat(item)
              } else {
                newValue = item;
              }
              let options = this.state.options.concat(item);

              this.__isMounted && this.setState({value: newValue, options: options})
              on_change_done(newValue)

            })
      } else if (this.props.local_create) {
        let options = this.state.options.concat(newValue)
        // console.log('*........ ## localcreate', options);
        this.setState({options, value: newValue})
        on_change_done(newValue)
      } else {
        window.notify.error('POST url is not configured')
      }

    } else {
      this.__isMounted && this.setState({value: newValue})
      on_change_done(newValue)
    }



    function on_change_done(newValue) {

      props.onChange && props.onChange((isMulti
          ? _.map(newValue, it => it.value)
          : newValue.value), newValue)

      // window.tt = _this;
      // console.log('*........ ## hhhhhhh');
      // _this.select.setState({ defaultMenuIsOpen: true });
      // _this.select.isOpen = true;
    }

    console.groupEnd();
  };

  render() {
    if (!this.__isMounted) {
      return (<div></div>);
    }
    function selectRef(selectInstance) {
      var originalSetValue = selectInstance.setValue;
      selectInstance.setValue = function() {
        originalSetValue.apply(this, arguments);
        selectInstance.setState({
          isOpen: true,
        });
      }
    }
    let Select = <div>Creatable Select</div>
    return (
        <div style={{marginBottom: '-10px'}} className={"auto_compl"}>
          {this.props.isSelectOnly ?
              <Select
                  isMulti={this.props.isMulti}
                  selectedOption={true}
                  value={this.state.value}
                  placeholder={this.props.placeholder}

                  // getOptionLabel={({label}) => label}
                  // getOptionValue={({value}) => value}
                  onChange={this.handleChange}
                  options={this.state.options}
                  // ref={(it) => this.select = it}
              >

              </Select> :
              <Select


                  isMulti={this.props.isMulti}
                  selectedOption={true}
                  value={this.state.value}
                  placeholder={this.props.placeholder}
                  // getOptionLabel={({label}) => label}
                  // getOptionValue={({value}) => value}
                  onChange={this.handleChange}
                  options={this.state.options}
              />}
          {/*<CreatableSelect*/}

        </div>
    );
  }
}

global.AutoComplete = AutoComplete;

export default AutoComplete
