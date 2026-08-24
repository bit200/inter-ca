import Skeleton from "../../libs/Skeleton";

export const ExamLoader = () => (
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
)
export default ExamLoader;
