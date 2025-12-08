import MyImg from "../MyImg";
import React from "react";

export function IncorrectExamData () {
    return <>
        <hr/>
        <div className="card">
            <div className="card-body tc">

                <div className={'tc'}
                     style={{
                         fontSize: '30px',
                         fontWeight: 'bold',
                         textAlign: 'center', width: '100%', padding: '50px 10px'
                     }}>

                    {t('noCorrectExamData')}
                    <div>
                        <MyImg w={300} top={20}>404</MyImg>
                    </div>

                </div>

            </div>
        </div></>
}

