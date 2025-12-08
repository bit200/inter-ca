import React from 'react'
import './button.css'

let $ = window.$;

class GroupButton extends React.Component {
  onClick(e) {
    let {type, prevent} = this.props;
    let el = e.target;
    if (!('disabled' in this.props)) {
      el.disabled = type !== 'submit'
    }
    $(el).removeClass('shake');
    setTimeout(() => {
      this.props.onClick && this.props.onClick(() => {
        el.disabled = false;
      }, () => {
        el.disabled = false;
        $(el).addClass('shake');
      }, e)
    }, 10)

    if (prevent) {
      e.preventDefault()
      e.stopPropagation()
      return null
    }
  }

  render() {
    let {type, id, items, onChange, value, color} = this.props;

    // console.log('*........ ## items', items);
    let className = color == 3 ? 'btn-success' : color == 2 ? 'btn-warning' : color == 1 ? 'btn-secondary' : 'btn-primary';
    className += ' btn ' + (this.props.className || '');
    return (
      <div>
        <div className="ib mr-15">
          {(items || []).map((it, ind) => {
            return (
              <button className={" btn-default btn-xs " + (it.key === value ? ' active ' : ' ')} onClick={(e) => {
                onChange && onChange(it.key)
              }} >{it.name}</button>
            )
          })}
        </div>
      </div>
    )
  }
}

global.GroupButton = GroupButton;

export default GroupButton

//
// let ar = {
//   "@context": "https://schema.org",
//   "@graph"  : [{
//     "@type" : "Organization",
//     "@id"   : "https://oyelabs.com/#organization",
//     "name"  : "Oyelabs",
//     "url"   : "https://oyelabs.com/",
//     "sameAs": [],
//     "logo"  : {"@type": "ImageObject", "@id": "https://oyelabs.com/#logo", "inLanguage": "en-US", "url": "https://oyelabs.com/wp-content/uploads/2020/04/oyelabs-logo-blue-1.png", "width": 300, "height": 84, "caption": "Oyelabs"},
//     "image" : {"@id": "https://oyelabs.com/#logo"}
//   }, {
//     "@type"          : "WebSite",
//     "@id"            : "https://oyelabs.com/#website",
//     "url"            : "https://oyelabs.com/",
//     "name"           : "Oyelabs - Driving Business Value",
//     "description"    : "Customized On-Demand Delivery Solutions",
//     "publisher"      : {"@id": "https://oyelabs.com/#organization"},
//     "potentialAction": [{"@type": "SearchAction", "target": "https://oyelabs.com/?s={search_term_string}", "query-input": "required name=search_term_string"}],
//     "inLanguage"     : "en-US"
//   }, {
//     "@type"     : "ImageObject",
//     "@id"       : "https://oyelabs.com/food-delivery-mobile-app-development-cost/#primaryimage",
//     "inLanguage": "en-US",
//     "url"       : "https://oyelabs.com/wp-content/uploads/2020/08/food-delivery-app-development-cost.jpg",
//     "width"     : 770,
//     "height"    : 400,
//     "caption"   : "food delivery app development cost"
//   }, {
//     "@type"             : "WebPage",
//     "@id"               : "https://oyelabs.com/food-delivery-mobile-app-development-cost/#webpage",
//     "url"               : "https://oyelabs.com/food-delivery-mobile-app-development-cost/",
//     "name"              : "Cost to Develop a Food Delivery App like EatClub and Zesty",
//     "isPartOf"          : {"@id": "https://oyelabs.com/#website"},
//     "primaryImageOfPage": {"@id": "https://oyelabs.com/food-delivery-mobile-app-development-cost/#primaryimage"},
//     "datePublished"     : "2020-08-28T13:47:25+00:00",
//     "dateModified"      : "2020-08-31T07:50:31+00:00",
//     "description"       : "Building a food delivery app like Zesty or EatClub may cost $5,000 to $30,000; however, the price may vary if you want to customize the app.",
//     "inLanguage"        : "en-US",
//     "potentialAction"   : [{"@type": "ReadAction", "target": ["https://oyelabs.com/food-delivery-mobile-app-development-cost/"]}]
//   }, {
//     "@type"           : "Article",
//     "@id"             : "https://oyelabs.com/food-delivery-mobile-app-development-cost/#article",
//     "isPartOf"        : {"@id": "https://oyelabs.com/food-delivery-mobile-app-development-cost/#webpage"},
//     "author"          : {"@id": "https://oyelabs.com/#/schema/person/3036db998067fe2b7d4fca405afec666"},
//     "headline"        : "Cost to Develop a Food Delivery App like EatClub and Zesty",
//     "datePublished"   : "2020-08-28T13:47:25+00:00",
//     "dateModified"    : "2020-08-31T07:50:31+00:00",
//     "mainEntityOfPage": {"@id": "https://oyelabs.com/food-delivery-mobile-app-development-cost/#webpage"},
//     "commentCount"    : 0,
//     "publisher"       : {"@id": "https://oyelabs.com/#organization"},
//     "image"           : {"@id": "https://oyelabs.com/food-delivery-mobile-app-development-cost/#primaryimage"},
//     "keywords"        : "food delivery,food on demand",
//     "articleSection"  : "App Development,On-Demand Delivery",
//     "inLanguage"      : "en-US",
//     "potentialAction" : [{"@type": "CommentAction", "name": "Comment", "target": ["https://oyelabs.com/food-delivery-mobile-app-development-cost/#respond"]}]
//   }, {
//     "@type"      : "Person",
//     "@id"        : "https://oyelabs.com/#/schema/person/3036db998067fe2b7d4fca405afec666",
//     "name"       : "Anurag Jain",
//     "image"      : {"@type": "ImageObject", "@id": "https://oyelabs.com/#personlogo", "inLanguage": "en-US", "url": "https://secure.gravatar.com/avatar/2d78a2b1211fc01dc48ea2a19fd487af?s=96&d=mm&r=g", "caption": "Anurag Jain"},
//     "description": "Founder/CEO Oyelabs, he has helped 20+ founders in developing and making technology startup successful. FYI he loves home cooked food and curious about everything."
//   }]
// }
