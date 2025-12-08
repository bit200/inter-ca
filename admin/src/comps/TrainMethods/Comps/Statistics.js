import React, {useState} from 'react';
import Skeleton from "../../../libs/Skeleton/Skeleton";
function toOdb(cd) {
  let _cd = new Date(cd);
  return [_cd.getFullYear(), pub(_cd.getMonth() + 1), pub(_cd.getDate())].join('-')
}
function pub(v) {
  return v < 10 ? '0' + v : v;
}

function Layout2(props) {
 //console.log('*........ ## ROOT RENDER555555555555', props);
  let getDate = (cd) => {
    cd = new Date(cd)
    let odb = toOdb(cd)
    let str = '-'
    return {odb, str: odb.substring(5, 1000)}
  }
  let getDays = (size) => {
    let cd = new Date().getTime();
    let day = 1000 * 24 * 3600;

    return m.from_to(0, size - 1).map((v, ind) => {
      return getDate(cd - ind * day)
    })
  }

  let [days, setDays] = useState(getDays(12))
  let {histByDays = {}, loading, readStats = {}, sessionByDays = {}} = props?.res?.result || {}
  // let __days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс',]

  let get = (odb, keys) => {
    let it = histByDays[odb] || {}
    _.each(keys, (item, ind) => {
      it = it[item] || {isEmptyObj: true};
    })
    return it?.isEmptyObj ? '-' : it;
  }

  if (loading || props.loading) {
    return <Skeleton woLabel={false} count={7} title={t('loading')}></Skeleton>
  }

  // let v = useActionData();
  return <div className={'afade'}>
    {/*<div className="pr">Селектор дня</div>*/}
    <h4>{t('stats')}</h4>
    <hr/>
    {/*<small className="row">*/}
    {/*    <div className="col-sm-2">Date</div>*/}
    {/*    <div className="col-sm-2">Exam</div>*/}
    {/*    <div className="col-sm-2">ExamC</div>*/}
    {/*    <div className="col-sm-2">TotalQH</div>*/}
    {/*    <div className="col-sm-2">RecSize</div>*/}
    {/*    <div className="col-sm-2">RecSp</div>*/}
    {/*</small>*/}
    <>
      <div className="row">
        <div className="col-sm-4"></div>
        <div className="col-sm-8">
          <div className="row">
            {(days || []).map((it, ind) => {
              return (<div key={ind} className={'col-sm-1 hashTitle'}>
                <small>
                  <b>{it.str}
                  </b>
                </small>
              </div>)
            })}
          </div>
        </div>
      </div>

      {([
        {name: 'firstLearnMsg', fn(odb) {
          let st = readStats[odb] || {}
          return st.firstQuestionsCount
          }},
        {name: 'studyQuestions', fn(odb) {
            let st = readStats[odb] || {}
            return st.uniqueQuestionCount
          }},
        {name: 'on5inExam', keys: ['examRates', '5']},
        {name: 'on5inTrain', keys: ['trainRates', '5']},
        {name: 'trainPassed', keys: ['trainCount']},
        {name: 'mockInterviews', keys: ['examCount']},
        {
          name:'avgRateTrain', fn(odb) {
            let st = get(odb, [])
            let rates = st.trainRates || {};
            let count = st.trainCount || 0;
            if (!count) {
              return '-'
            }
            let value = 0;
            _.each(m.from_to(1, 5), (item, ind) => {
              value += (rates[item] || 0) * item;
            })

            return ((value / count) || 0).toFixed(1);
          }
        },
        {
          name: 'avgRateExam', fn(odb) {
            let st = get(odb, [])
            let rates = st.examRates || {};
            let count = st.examCount || 0;
            if (!count) {
              return '-'
            }
            let value = 0;
            _.each(m.from_to(1, 5), (item, ind) => {
              value += (rates[item] || 0) * item;
            })

            return ((value / count) || 0).toFixed(1);
          }
        },
        {
          name: 'recLenght', fn(odb) {
            let count = +get(odb, ['recCount']) || 0;
            let size = get(odb, ['recSizes']) || 0
            let time = get(odb, ['recTime']) || 0
            if (!count) {
              return '-'
            }
            return +((size / count) || 0).toFixed(1);
          }
        },
        {name: 'recSpeed', fn(odb) {
            let count = +get(odb, ['recCount']) || 0;
            let size = get(odb, ['recSizes']) || 0
            let time = get(odb, ['recTime']) || 0;
            if (!count) {
              return '-'
            }
            return +((time / count) || 0).toFixed(1);
          }},
      ] || []).map((it, ind) => {
        return (<div key={ind} className="row hover">
          <div className="col-sm-4">
            <small>{t(it.name)}</small>
          </div>

          <div className="col-sm-8">
            <div className="row">
              {(days || []).map((day, ind) => {
                let {odb} = day;
                let fn = it.keys ? get(odb, it.keys) : it.fn ? it.fn(odb) : '--'

                return (<div key={ind} className={'col-sm-1 hashTitle'}>
                  <small>
                    {fn}
                  </small>
                </div>)
              })}
            </div>
          </div>

        </div>)
      })}
    </>

  </div>
}

export default Layout2
