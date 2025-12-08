import React, {useState} from 'react';

function Layout2(props) {
 //console.log('*........ ## ROOT RENDER', props);


  // let v = useActionData();
  return <div>
    <div className="pr">Селектор дня</div>
    Рабочие Сессии
    <hr/>
    <div className="row">
      <div className="col-sm-2">
        Курсы
      </div>
      <div className="col-sm-2">
        Модули
      </div>
      <div className="col-sm-3">
        Вопросы
      </div>
      <div className="col-sm-5">
        Квизы с прокруткой
        <hr/>
        Сессии
      </div>
    </div>
    {/*<small className="row">*/}
    {/*    <div className="col-sm-2">Date</div>*/}
    {/*    <div className="col-sm-2">Exam</div>*/}
    {/*    <div className="col-sm-2">ExamC</div>*/}
    {/*    <div className="col-sm-2">TotalQH</div>*/}
    {/*    <div className="col-sm-2">RecSize</div>*/}
    {/*    <div className="col-sm-2">RecSp</div>*/}
    {/*</small>*/}

  </div>
}

export default Layout2
