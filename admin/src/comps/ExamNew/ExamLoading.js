import MyImg from "../MyImg";
import React from "react";
import Skeleton from "../../libs/Skeleton/Skeleton";

export function ExamLoading () {
    return <>
        <div className={'row'}>
            <div className="col-xs-12">
                <div className="card">
                    <div className="card-body text-center tc">
                        <Skeleton count={3} label={t('examLoading') + ' ...'}></Skeleton>
                    </div>
                </div>
                {/*<Loading loading={true}/>*/}
            </div>
        </div>
    </>
}

