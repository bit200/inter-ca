import React from 'react'
import ExtracterDetailed from './ExtracterDetailed'

let _ = window._;
const {http, NotFound, Wrapper, m, Loading, ReactExtender} = window.my;

class ExtracterDetailedPage extends ReactExtender {
  constructor(props) {
    super(props);
    this.state = {};
    this.opts = m.getOpts(this.props.match.params.path);
    this.params = this.props.match.params;
    if (this.params.id) {
      this.state.loading = true
      this.loadOne()
    }

  }

  onChange(v) {
    let item = this.state.item;
    this.setState({item: _.extend(item, v)})
  }

  loadOne() {
    http.get(this.opts.url + '/' + this.params.id)
      .then(item => {
        // console.log('........ ## rrr', item);
        this.setState({item, loading: false, loaded: true})
      })
      .catch((e, code) => {
        this.setState({loading: false, loaded: true, code});
        // console.log('........ ## eee', e, code);
      })
  }

  render() {
    let {item = {}, loading, loaded, code} = this.state;
    let opts = this.opts;
    // let url = m.get_
    let _this = this;

    return <Wrapper
      woTitle={this.props.woTitle}
      woMainWrapper={this.props.woMainWrapper}
      title={opts.title + ' #' + this.params.id} back={opts.back_url}>
      <Loading loading={loading}>
        {loading || item._id ? <ExtracterDetailed
          _this={_this}
          onChange={(v) => {
            this.onChange(v)
          }}
          opts={opts} item={item}
          changeOrder={() => {
            // console.log('*........ ## hhhhhhhiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii');
          }
          }
          emitToParent={(a, b, c) => this.props.emitToParent && this.props.emitToParent(a, b, c)}
        ></ExtracterDetailed> : <NotFound code={code}></NotFound>}
      </Loading>
    </Wrapper>
  }

}

export default ExtracterDetailedPage
