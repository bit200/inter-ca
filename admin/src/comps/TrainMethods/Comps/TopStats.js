import React, {useState} from 'react';
import CircularProgress2 from "./CircularProgress2";
import Button from "../../../libs/Button";

function Layout2(props) {
    //console.log('*........ ## ROOT RENDER', props);

    let {totalStats, onClickTrain, onClickExam} = props;

    // let v = useActionData();
    let cl = 'col-sm-12'
    return <>
        <div className={cl}>
            <div className="card">
                <div className="card-body">
                    Тренировочные Интервью

                    <div className={'statTotalPerc'}>
                        {totalStats.exam}%
                        <div className="ib mlcircle">
                            <CircularProgress2
                                title={""} value={totalStats.exam} size={20}></CircularProgress2>
                        </div>
                    </div>
                    <hr/>
                    <Button color={0} size={'xs'}
                            onClick={(cb) => {
                                onClickExam()
                                cb && cb();
                            }}
                    >Тренировочное Интервью</Button>
                    <div></div>
                    <small>На отлично: {totalStats.exam100}%</small>
                </div>
            </div>
        </div>
        <div className={cl}>
            <div className="card">
                <div className="card-body">
                    Тренировка
                    <div className={'statTotalPerc'}>
                        {totalStats.train}%
                        <div className="ib mlcircle">
                            <CircularProgress2
                                title={""} value={totalStats.train} size={20}></CircularProgress2>
                        </div>
                    </div>
                    <hr/>
                    <Button color={0} size={'xs'} onClick={(cb) => {
                        cb && cb();
                        onClickTrain()

                    }}>Подготавливаться</Button>
                    <div></div>
                    <small>На отлично: {totalStats.train100}%</small>
                </div>
            </div>
        </div>
        <div className={cl}>
            <div className="card">
                <div className="card-body">
                    Качество изучения (крайняя сессия)
                    <div className="row">
                        <div className="col-sm-6">
                            <div className={'statTotalPerc'}>
                                {(totalStats.trainNotNullAvgRate / 20).toFixed(1)}
                            </div>
                            <small>
                                Тренировка
                            </small>
                        </div>
                        <div className="col-sm-6">
                            <div className={'statTotalPerc'}>
                                {(totalStats.examNotNullAvgRate / 20).toFixed(1)}
                            </div>
                            <small>
                                Интервью
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </>
}

export default Layout2
