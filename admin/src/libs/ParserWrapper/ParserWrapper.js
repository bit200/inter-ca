import React from 'react'
import ReactExtender from './../ReactExtender/ReactExtender';
import WhiteWrapper from './../WhiteWrapper/WhiteWrapper';
import FakeDataHtml from './FakeDataHtml';
import m from './../m/m';
import Hr from './../Hr/Hr';
import Textarea from './../Textarea/Textarea';

let $ = window.$;
let _ = window._;


// let {ReactExtender, WhiteWrapper} = window.my;

class ParserWrapper extends ReactExtender {

  constructor(props) {
    super(props);
    this.state = {
      temp: {
        validations: [{}]
      }
    };
    this._id = m.get_id()
    this.ind = 0;
    this.qind = 0;
  }

  componentDidMount() {
    this.updateFrame()
  }

  debugIt(opts) {
   // console.log'........ ## dbug it here', opts);
    if (opts.method === 'debug-it') {
      let data = opts.params;
     // console.log'........ ## DEBUG it data:', data);
    }
  }

  getFrame() {
    return $('#my_iframe').contents();
  }

  updateFrame() {
    let $el = this.getFrame();
   // console.log'........ ## FakeDataHtml', FakeDataHtml);
    FakeDataHtml.get((html) => {

      html += `<style>
.debug-wrapper-selected {
    background: lightblue!important;
    /*background: lightgreen!important;*/
}
div {
  padding-left: 10px;
}
</style>`;


      $el.find('html').html(html);
      $el.click((e) => {
        let arr = this.getFullQueue($(e.target), [], this.state.arr)
        this.setState({arr});
        this.updateQuery(arr, this.state.arr)
        e.preventDefault()
        e.stopPropagation()
        return null;
      })
      $el.find('#sub').click()

    })

  }

  getFullQueue($el, arr, old_arr) {
    // console.log('........ ## $el', $el);
    let tagName = $el.prop("tagName");
    let attributes = [];

    _.each($el[0].attributes, (it, key) => {
      if (!/^class$|^id$|^style$/i.test(it.nodeName)) {
        let obj = {}
        obj.name = it.nodeName;
        obj.value = it.nodeValue;
        obj.query = `[${obj.name}="${obj.value}"]`;
        // obj.selected = this.getSelected(['arr', arr.length, 'attributes'], obj.name);
        attributes.push(obj)
      }
    })
    arr.unshift({
      classes: _.map(($el.attr('class') || '').split(/\s+/), it => {
        return {
          name: it
        }
      }),
      id     : {name: $el.attr('id')},
      attributes,
      tagName: {name: tagName}
    });
    let $parent = $el.parent();

    if ($parent && !/BODY|HTML/i.test(tagName)) {
      this.getFullQueue($parent, arr)
    }


    return arr//.reverse();
  }

  getSelected(arr) {
    this.getDeep(arr);

  }

  attrUpdate(arr, value) {
    this.deepUpdate(arr, value)
    this.updateQuery(this.state.arr)
  }

  updateQuery(arr) {
    let query = this.buildQuery(arr);
    let count = 0;
    let selClass = 'debug-wrapper-selected'
    this.getFrame().find('.' + selClass).removeClass(selClass)

    this.getFrame().find(query).each((it, el) => {
      count++;
      $(el).addClass(selClass)
    });
    this.setState({query, count}, () => {
      $('#for-query textarea').focus().select()
    })
  }

  buildQuery(arr) {
    let query = ''
    _.each(arr, (it) => {
      let sub_query = ''
      if (it.tagName && it.tagName.selected) {
        sub_query += it.tagName.name.toLowerCase()
      }

      if (it.id && it.id.selected) {
        sub_query += '#' + it.id.name
      }
      _.each(it.classes, (it, ind) => {
        if (it.selected) {
          sub_query += '.' + it.name
        }
      });

      _.each(it.attributes, (it, ind) => {
        if (it.selected) {
          sub_query += it.selected === 1 ? `[${it.name}="${it.value}"]` : `[${it.name}]`
        }
      })

      if (sub_query) {
        query += ' ' + sub_query
      }

    })
    return query;
  }

  render() {
    let {arr, query = '', count, temp = {}} = this.state;
    query = query.trim('')
   // console.log'........ ## temp', temp);
    return (<div className="back-padding">
      <WhiteWrapper>
        {(arr || []).map((item, ind) => {
          return (<div key={ind} style={{paddingLeft: 3 * ind + 'px'}}>
            <div className={"attr-item " + (item.tagName.selected ? 'selected' : '')}
                 onClick={(e) => {
                   this.attrUpdate(['arr', ind, 'tagName', 'selected'], !item.tagName.selected)
                 }}>
              {item.tagName.name} {item.tagName.selected}
            </div>
            {item.id.name && <div className={"attr-item " + (item.id.selected ? 'selected' : '')}
                                  onClick={(e) => {
                                    this.attrUpdate(['arr', ind, 'id', 'selected'], !item.id.selected)
                                  }}>
              #{item.id.name}
            </div>}
            {(item.classes || []).map((item, ind1) => {
              return (item.name ? <div key={ind1} className={"attr-item " + (item.selected ? 'selected' : '')}
                                       onClick={(e) => {
                                         this.attrUpdate(['arr', ind, 'classes', ind1, 'selected'], !item.selected)
                                       }}>
                .{item.name}
              </div> : null)
            })}
            {(item.attributes || []).map((item, ind1) => {
              item.selected = item.selected || 0;
              return (item.name ? <b key={ind1} className={"attr-item " + (item.selected ? 'selected' : '')}
                                     onClick={(e) => {
                                       this.attrUpdate(['arr', ind, 'attributes', ind1, 'selected'], ++item.selected % 3)
                                     }}>
                {item.query}
              </b> : null)
            })}
          </div>)
        })}
        <div>
          <a onClick={(e) => {
            this.updateFrame()
          }}>Clear</a>
          <Hr/>
          <b>x{count || 0} QUERY: </b>
          <div className={"mh15"} id={"for-query"}>
            <b>{query}</b>
            <Textarea value={query}/>
          </div>
          {/*<Hr/>*/}
          {/*<div className="col-xs-4">*/}
          {/*<b onClick={(e) => {this.deepUpdate(['temp', 'validations'], {}, 'push')}} >*/}
          {/*Validations: +</b>*/}
          {/*{(temp.validations || []).map((item, ind) => {*/}
          {/*return (<div key={ind} >*/}

          {/*<ParserLine*/}
          {/*onChange={(value, key) => {*/}
          {/*console.log('........ ## change parser line', value, key);*/}
          {/*}}*/}
          {/*></ParserLine>*/}
          {/*<span*/}
          {/*onClick={(e) => {this.deepUpdate(['temp', 'validations'], ind, 'pop')}}*/}
          {/*>XXXX</span>*/}
          {/*</div>)*/}
          {/*})}*/}
          {/*</div>*/}
          {/*<div className="col-xs-4">*/}
          {/*Data:*/}
          {/*<ParserLine*/}
          {/*onChange={(value, key) => {*/}
          {/*console.log('........ ## change parser line', value, key);*/}
          {/*}}*/}
          {/*></ParserLine>*/}

          {/*</div>*/}
          {/*<div className="col-xs-4">*/}
          {/*Res:*/}
          {/*</div>*/}

        </div>

      </WhiteWrapper>
      <WhiteWrapper>
        <iframe src="" frameBorder="0" id="my_iframe" scrolling="no" onload="resizeIframe(this)"/>
      </WhiteWrapper>
    </div>)
  }

}

export default ParserWrapper
