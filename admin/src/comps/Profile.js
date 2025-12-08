import React, {useState, useEffect} from "react";
import _ from "underscore";
import user from "libs/user/user";
import Button from "libs/Button";

import {Link, Outlet} from "react-router-dom";
import Smart from "libs/Smart";
import MyTable from "./MyTable";
import Input from "../libs/Input";
import MyModal from "../libs/MyModal";
import ImageUploader from "../libs/ImageUploader/ImageUploader";
import {DEFAULT_AVATAR} from "./Header/Header1";

function ProfileImgPath(v) {
    console.log("qqqqq v2222", v);
    let {item, onChange} = v;
    let isDefault = !item.main_img
    return <div className={'tcf'}>
        <ImageUploader
            isDefault={isDefault}
            inputId={'fileUploader'}
            src={item.main_img ? global.env.VIDEO_STATIC_DOMAIN + item.main_img : DEFAULT_AVATAR}
            onChange={(r) => {
                console.log("qqqqq vvvvvvvvvvvvvvvv", r);
                let profile = {...item, main_img: r.url ? r.url + "?v=" + new Date().getTime() : ''}
                onChange(profile)
                user.on_update(profile, () => {
                    global.UpdateRootFn && global.UpdateRootFn();
                });
            }}></ImageUploader>
    </div>

}

// function ResetPass ()


function Layout2(props) {
    let [profile, setProfile] = useState(user.get_info());
    // useEffect(() => {
    //   window.user = user;
    // }, [])
    //console.log("*........ ## ROOT profileprofileprofileprofile", profile);

    // let v = useActionData();
    profile ??= {}
    return (
        <div className={'card'}>

            <div className={'card-body animChild'}>
                <div className="row">
                    <div className="col-sm-4">
                        <ProfileImgPath item={profile}
                                        onChange={(v) => {
                                            console.log("qqqqq vvvvvvvvvvvvvvvvvvvvvvvvvvv", v);
                                            setProfile({...v})
                                        }}
                        ></ProfileImgPath>
                    </div>
                    <div className="col-sm-8">
                        <Smart
                            obj={profile}
                            items={[
                                // {
                                //     size: 4, childs: [
                                //         {
                                //             size: 12,
                                //             Component: ProfileImgPath
                                //             // ProfileImgPath
                                //         },
                                //         // {size: 12, type: 'HR'},
                                //
                                //     ]
                                // },
                                {
                                    size: 12,
                                    className: 'animChild vvasdfasdf',
                                    childs: [
                                        {type: "input", key: "first_name", label: 'name1', size: 6},
                                        {type: "input", key: "surname", label: 'name2', size: 6},
                                        {type: "input", key: "father_name", label: 'name3', size: 6},
                                        // {type: "input", key: "main_img", label: 'main_img', size: 6},
                                        // {size: 12, type: 'HR'},
                                        // {size: 6, text: '', type: 'skip'},
                                        {type: "input", key: "email", label: 'email', size: 6},
                                        // {type: "input", key: "phone", label: "Телефон", size: 6},
                                        {type: "input", key: "slack", label: 'tg', size: 6},
                                        {
                                            Component() {
                                                return <div className={'mt-2'}>
                                                    {t('yourLoginUsername')}:
                                                    <div></div><b>{profile.username}</b></div>
                                            },
                                            size: 6,
                                        },
                                        {
                                            size: 12,
                                            Component: () => {
                                                let [open, setOpen] = useState(false)
                                                let [pass, setPass] = useState('')

                                                return (
                                                    <div className={"mt-2 pull-right"}>

                                                        <div className={''}>
                                                            <div></div>
                                                            <Button color={4} size={'md'} onClick={(scb) => {
                                                                setOpen(true)
                                                                scb && scb()
                                                            }}>
                                                                <i className="iconoir-eye-closed"></i>
                                                                {t('resetPass')}
                                                            </Button>
                                                            <MyModal
                                                                size={'small'}
                                                                isOpen={open}
                                                                onClose={() => setOpen(false)}
                                                            >
                                                                <Input
                                                                    type={'password'}
                                                                    id={'insertNewPass'}
                                                                    preventAutocomplete={true}
                                                                    placeholder={'insertNewPass'}
                                                                    value={pass} onChange={setPass}
                                                                    label={('insertNewPass')}></Input>
                                                                <div className={'tr mt-2'}>
                                                                    <Button size={'sm'} color={4} onClick={(scb) => {
                                                                        setOpen(false)
                                                                        scb && scb()
                                                                    }}>
                                                                        <i className="iconoir-xmark"></i>
                                                                        {t('cancel')}</Button>
                                                                    <Button size={'sm'} color={0}
                                                                            onClick={(scb, ecb) => {

                                                                                profile = {
                                                                                    ...profile,
                                                                                    plain_password: pass
                                                                                }
                                                                                setProfile(profile)
                                                                                user.on_update(profile, () => {
                                                                                    setOpen(false)
                                                                                }, () => {
                                                                                    setOpen(false)
                                                                                });

                                                                            }}>
                                                                        <i className="iconoir-double-check"></i>
                                                                        {t('update')}</Button>
                                                                </div>

                                                            </MyModal>
                                                        </div>

                                                    </div>
                                                );
                                            },
                                        },
                                    ]
                                },
                                // {type: "input", key: "first_name", label: 'name1', size: 6},
                                // {type: "input", key: "surname", label: 'name2', size: 6},
                                // {type: "input", key: "father_name", label: 'name3', size: 6},
                                // {type: "input", key: "main_img", label: 'main_img', size: 6},
                                // {size: 12, type: 'HR'},
                                //
                                // {type: "input", key: "email", label: 'email', size: 6},
                                // // {type: "input", key: "phone", label: "Телефон", size: 6},
                                // {type: "input", key: "slack", label: 'tg', size: 6},
                                // {
                                //     Component: ProfileImgPath
                                // },
                                // {type: "date", key: "birthday", label: "Дата рождения", size: 6},

                                // {size: 12, type: 'HR'},

                            ]}
                            onChange={(v) => setProfile({...v})}
                        ></Smart>
                    </div>
                </div>
                <hr/>
                <div className="pull-right">
                    <Button
                        onClick={(scb, ecb) => {
                            user.on_update(profile, scb, ecb);
                        }}
                    >
                        <i className="iconoir-double-check"></i>
                        {T('save')}
                    </Button>
                </div>
                {/* <hr/>
      <MyTable
      ></MyTable> */}
            </div>
        </div>
    );
}

function PassReset() {

}


export default Layout2;
