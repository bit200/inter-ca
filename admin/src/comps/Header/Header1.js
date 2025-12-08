import React, {useState, useEffect} from "react";
// import Popover from "@mui/material/Popover";
// import Typography from "@mui/material/Typography";
// import Button from "@mui/material/Button";
// import Menu from "./Menu";
// import AppBar from "@mui/material/AppBar";
// import Box from "@mui/material/Box";
// import Toolbar from "@mui/material/Toolbar";
// import IconButton from "@mui/material/IconButton";
// import MenuIcon from "@mui/icons-material/Menu";
import {Link} from "react-router-dom";
import user from "libs/user/user";
import SvgIcon from "@mui/material/SvgIcon";
import colorTheme from "./../ColorTheme";
import {iconsList} from "libs/IconsList";
import MyImg from "../MyImg";
import MyModal from "../../libs/MyModal";

export function LogoImgRuEn() {
    return <>
                        <div className="ruOnly ">
                            <img src="/st/logoSk.svg" alt="logo-large" className="logo-lg light-mode"/>
                            <img src="/st/logoSkDark.svg" alt="logo-large" className="logo-lg dark-mode"/>
                        </div>
                        <div className={'notRuOnly '}>
                            <img src="/st/logoSkEn.svg" alt="logo-large" className="logo-lg light-mode"/>
                            <img src="/st/logoSkEnDark.svg" alt="logo-large" className="logo-lg dark-mode"/>
                        </div>
                    </>
}
export const DEFAULT_AVATAR = '/st/avatars/empty.png'
export function UserImg() {
    let info = user.get_info() || {};

    // return <img src="https://mannatthemes.com/rizz/default/assets/images/users/avatar-1.jpg" alt=""
    return <div className={'imgWrapLogo'}>
    <div className="image-responsive-square"   style={{backgroundImage: `url('${info.main_img ? env.VIDEO_STATIC_DOMAIN + info.main_img : DEFAULT_AVATAR}')`}}>
    </div>
    </div>

    // return <div className="image-responsive-square"
    // >
    //     <div className="logo8">
    //         <div className="iconoir-user"></div>
    //         {/*<div className="iconoir-user-badge-check"></div>*/}
    //     </div>
    // </div>
    // return <img src="/st/avatars/2.png" alt=""
    //             style={{borderRadius: '50%'}}/>
}

function BasicPopover(props) {
    let [Comp, setComp] = useState(null);
    let [cd, setCd] = useState(0);
    let [search, setSearch] = useState('')
    let [navTabInd, setNavTabInd] = useState(0)
    let [open, setOpen] = useState(false)
    let [openLng, setOpenLng] = useState(false)
    let [open2, setOpen2] = useState(false)
    let [openWhy, setOpenWhy] = useState(false)

    function onOpenWhy() {
        setOpenWhy(true)
    }


    window.onRerenderMenu = () => setCd(new Date().getTime())
    window.onRenderLeftMenu = (comp) => {
        try {
            setComp(comp);
        } catch (e) {

        }
    };
    let href = window.location.pathname;
    useEffect(() => {
        document.body.setAttribute("data-page-url", href);
        Comp && setComp(null);
        setOpen(false)
    }, [href]);

    let isMenu = !Boolean(Comp);
    let logoImg = global?.env?.logoImg || {};

    function onSubmit() {
        setSearch('')
        window.navigate(`/search?q=${search}`)
    }

    let lngs = window.lngs

    let eduSteps = [
        {
            name: t('eduAccreditationTitle'),
            desc: t('eduAccreditationDesc'),
            icon: 'iconoir-cube-replace-face'
        },
        {
            name: t('portalTitle'),
            desc: t('portalDesc'),
            icon: 'iconoir-git-compare'
        },
        {
            name: t('curatorsTitle'),
            desc: t('curatorsDesc'),
            icon: 'iconoir-developer'
        },
        {
            name: t('hireTitle'),
            desc: t('hireDesc'),
            icon: 'iconoir-send-dollars'
        }
    ]
    return <>

        <MyModal
            isOpen={openWhy}
            onClose={() => {
                setOpenWhy(false)
            }}
        >
            {t('whyItIsWorking')}
            <hr/>
            <div className="activity">
                <div className="simplebar-content animChild" style={{padding: '10px'}}>

                    {(eduSteps || []).map((it, ind) => {
                        return (<div className="activity-info animCh" key={ind}>
                            <div className="icon-info-activity">
                                <i className={it.icon}></i>
                            </div>
                            <div className="activity-info-text">
                                <div className="d-flex justify-content-between align-items-center">
                                    <h6 className="m-0  w-75">
                                        {it.name}

                                    </h6>
                                    {/*<span className="text-muted">50 Min ago</span>*/}
                                </div>
                                <p className="text-muted mt-3">
                                    {it.desc}
                                </p>
                            </div>
                        </div>)
                    })}

                    <img src="/st/promo/portal.png" alt=""/>

                    {/*<div className="activity-info">*/}
                    {/*    <div className="icon-info-activity">*/}
                    {/*        <i className="las la-user-clock text-danger"></i>*/}
                    {/*    </div>*/}
                    {/*    <div className="activity-info-text">*/}
                    {/*        <div className="d-flex justify-content-between align-items-center">*/}
                    {/*            <h6 className="m-0  w-75">Task Overdue</h6>*/}
                    {/*            <span className="text-muted">50 Min ago</span>*/}
                    {/*        </div>*/}
                    {/*        <p className="text-muted mt-3">There are many variations of passages of Lorem Ipsum*/}
                    {/*            available, but the*/}
                    {/*            majority have suffered alteration.*/}
                    {/*            <a href="#" className="text-primary">[more info]</a>*/}
                    {/*        </p>*/}
                    {/*        <span className="badge badge-soft-secondary">Design</span>*/}
                    {/*        <span className="badge badge-soft-secondary">HTML</span>*/}
                    {/*    </div>*/}
                    {/*</div>*/}
                    {/*<div className="activity-info">*/}
                    {/*    <div className="icon-info-activity">*/}
                    {/*        <i className="las la-clipboard-check text-primary"></i>*/}
                    {/*    </div>*/}
                    {/*    <div className="activity-info-text">*/}
                    {/*        <div className="d-flex justify-content-between align-items-center">*/}
                    {/*            <h6 className="m-0  w-75">New Task</h6>*/}
                    {/*            <span className="text-muted">10 hours ago</span>*/}
                    {/*        </div>*/}
                    {/*        <p className="text-muted mt-3">There are many variations of passages of Lorem Ipsum*/}
                    {/*            available, but the*/}
                    {/*            majority have suffered alteration.*/}
                    {/*            <a href="#" className="text-primary">[more info]</a>*/}
                    {/*        </p>*/}
                    {/*    </div>*/}
                    {/*</div>*/}


                    {/*<div className="activity-info">*/}
                    {/*    <div className="icon-info-activity">*/}
                    {/*        <i className="las la-user-friends text-primary"></i>*/}
                    {/*    </div>*/}
                    {/*    <div className="activity-info-text">*/}
                    {/*        <div className="d-flex justify-content-between align-items-center">*/}
                    {/*            <h6 className="m-0">New Lead Miting</h6>*/}
                    {/*            <span className="text-muted">14 Nov 2019</span>*/}
                    {/*        </div>*/}
                    {/*        <p className="text-muted mt-3">There are many variations of passages of Lorem Ipsum*/}
                    {/*            available, but the*/}
                    {/*            majority have suffered alteration.*/}
                    {/*            <a href="#" className="text-primary">[more info]</a>*/}
                    {/*        </p>*/}
                    {/*    </div>*/}
                    {/*</div>*/}
                </div>
            </div>
        </MyModal>
        <div className="topbar d-print-none">
            <div className="container-xxl">
                {(open || open2 || openLng) && <div className="dropdown-wrap" onClick={() => {
                    setOpen2(false)
                    setOpenLng(false)
                    setOpen(false)
                }}></div>}

                <nav className="topbar-custom d-flex justify-content-between" id="topbar-custom">


                    <ul className="topbar-item list-unstyled d-inline-flex align-items-center mb-0">

                        <li>
                            <button className="nav-link mobile-menu-btn nav-icon" id="togglemenu" onClick={() => {
                                colorTheme.toggleSize()
                            }}>
                                <i className="iconoir-menu-scale"></i>
                            </button>
                        </li>
                        <li className="mx-3 welcome-text">
                            <h3 className="mb-0 fw-bold text-truncate">{user.get_public_name() || t('hardWork')}{t('offerMsg')}<i
                                className="iconoir-peace-hand menu-icon"></i>
                            </h3>
                        </li>
                    </ul>
                    <ul className="topbar-item list-unstyled d-inline-flex align-items-center mb-0">
                        <li className="hide-phone app-search">

                            {/*<Link to={'/search'} className="nav-link nav-icon" onClick={() => {*/}
                            {/*}}>*/}
                            {/*    <i className="iconoir-search"></i>*/}

                            {/*</Link>*/}
                            <form role="search"
                                // action="/"
                                // method="get"
                            >
                                <input name="search"
                                       value={search}
                                       onChange={(e) => setSearch(e.target.value)}
                                       onKeyDown={(e) => {
                                           console.log("qqqqq eee", e);
                                           if (e.keyCode === 13) {
                                               onSubmit()
                                               e.stopPropagation()
                                               return e.preventDefault();
                                           }


                                       }}
                                       className="form-control top-search mb-0"

                                       placeholder={nameFn('searchModules') + " ..."}/>
                                <button type="submit" onClick={() => {
                                    onSubmit()
                                }}><i className="iconoir-search"></i></button>
                            </form>
                        </li>

                        <li className="topbar-item rel ">
                            <a className="nav-link nav-icon" onClick={() => {
                                colorTheme.toggleTheme()
                            }}>
                                <i className="icofont-moon dark-mode"></i>
                                <i className="icofont-sun light-mode"></i>
                            </a>
                        </li>
                        <li className={"topbar-item  rel " + (open2 ? 'zMax' : '')}>
                            <a className="nav-link nav-icon" id="light-dark-mode1" onClick={() => {
                                setOpen2(!open2)
                            }}>
                                <i className="icofont-bell-alt"></i>
                            </a>
                            {open2 && <div className="dropdown-menu stop dropdown-menu-end dropdown-lg py-0 show afade"
                                           style={{
                                               position: 'absolute',
                                               'inset': '0px 0px auto auto',
                                               margin: '0px',
                                               transform: 'translate(-0px, 86px)'
                                           }}
                                           data-popper-placement="bottom-end">

                                <h5 className="dropdown-item-text m-0 py-3 d-flex justify-content-between align-items-center">
                                    {t('notifications')} <a href="#" className="badge text-body-tertiary badge-pill">
                                    {/*<i className="iconoir-plus-circle fs-4"></i>*/}
                                </a>
                                </h5>
                                <ul className="nav nav-tabs nav-tabs-custom nav-success nav-justified mb-1"
                                    role="tablist">
                                    <li className="nav-item" role="presentation" onClick={() => {
                                        setNavTabInd(0)
                                    }}>
                                        <a className={"nav-link mx-0 " + (navTabInd == 0 ? 'active' : '')}
                                           data-bs-toggle="tab" role="tab"
                                           aria-selected="true">
                                            {t('all')} <span
                                            className="badge bg-primary-subtle text-primary badge-pill ms-1">0</span>
                                        </a>
                                    </li>
                                    <li className="nav-item" role="presentation" onClick={() => {
                                        setNavTabInd(1)
                                    }}>
                                        <a className={"nav-link mx-0 " + (navTabInd == 1 ? 'active' : '')}
                                           data-bs-toggle="tab" role="tab" aria-selected="false"
                                           tabIndex="-1">
                                            {t('projectNotifications')}
                                        </a>
                                    </li>
                                    <li className="nav-item" role="presentation" onClick={() => {
                                        setNavTabInd(2)
                                    }}>
                                        <a className={"nav-link mx-0 " + (navTabInd == 2 ? 'active' : '')}
                                           data-bs-toggle="tab" role="tab"
                                           aria-selected="false"
                                           tabIndex="-1">
                                            {t('archive')}
                                        </a>
                                    </li>
                                </ul>
                                <div className={'afade tc'} key={navTabInd}>
                                    <div className="card-body" style={{padding: '30px 15px'}}>
                                        <h5>
                                            {nameFn('noActiveNotifications')}
                                        </h5>
                                        <MyImg w={100}>404</MyImg>
                                        {/*<img src="/st/404.svg" alt="" style={{width: '100px',}}/>*/}
                                    </div>
                                </div>
                            </div>}
                        </li>
                        <li className={"topbar-item  rel " + (openLng ? 'zMax' : '')}>
                            <a className="nav-link nav-icon" onClick={() => {
                                setOpenLng(!openLng)
                            }}>
                                <img src={'/st/flags/' + lng + '.jpg'} alt="" style={{height: '15px',}}
                                     className={'thumb-sm rounded-circle'}/>
                            </a>
                            {openLng &&
                                <div className="dropdown-menu stop dropdown-menu-end dropdown-md py-0 show afade"
                                     style={{
                                         position: 'absolute',
                                         'inset': '0px 0px auto auto',
                                         margin: '0px',
                                         transform: 'translate(-0px, 86px)'
                                     }}
                                     data-popper-placement="bottom-end">
                                    {(lngs || []).map((it, ind) => {
                                        return (<a key={ind} className={'dropdown-item'} onClick={() => {
                                            setOpenLng(false)
                                            setLng(it)
                                            UpdateRootFn && UpdateRootFn();
                                        }}>
                                            <img src={'/st/flags/' + it + '.jpg'} alt=""
                                                 style={{height: '15px', marginLeft: '-10px'}}
                                                 className={'me-2'}/>
                                            {t(it + 'Lng')}
                                        </a>)
                                    })}


                                </div>}

                        </li>
                        <li className={"topbar-item rel " + (open ? 'zMax' : '')}>
                            <a className="nav-link nav-icon" id="light-dark-mode2" onClick={() => {
                                setOpen(!open)
                            }}>
                                {/*<i className="icofont-user"></i>*/}
                                <UserImg></UserImg>
                            </a>
                            {open && <div className="dropdown-menu dropdown-menu-end py-0 show afade"
                                          style={{
                                              position: 'absolute',
                                              inset: '0px 0px auto auto',
                                              margin: '0px',
                                              transform: 'translate(0px, 86px)'
                                          }}
                                          data-popper-placement="bottom-end">
                                <div className="d-flex align-items-center dropdown-item py-2 bg-secondary-subtle">
                                    <div className="flex-shrink-0">
                                        <div className="nav-link nav-icon nav-icon-menu">
                                            <i className="icofont-user"></i>
                                        </div>
                                        {/*<img src="assets/images/users/avatar-1.jpg" alt="" className="thumb-md rounded-circle"/>*/}
                                    </div>
                                    <div className="flex-grow-1 ms-2 text-truncate align-self-center">
                                        <h6 className="my-0 fw-medium text-dark fs-13">{user.get_public_name()}</h6>
                                        <small className="text-muted mb-0">{user.get_position()}</small>
                                    </div>
                                </div>
                                <div className="dropdown-divider mt-0"></div>
                                <small className="text-muted px-2 pb-1 d-block">{t('mainMenuShort')}</small>
                                <Link className="dropdown-item" to={'/profile'}><i
                                    className="iconoir-user"></i> {t('profile')}</Link>
                                <Link className="dropdown-item" to={'/main'}><i
                                    className="iconoir-home-simple  menu-icon"></i> {t('dashboard')}</Link>
                                <Link className="dropdown-item" to={'/courses'}><i
                                    className="iconoir-peace-hand  menu-icon"></i> {t('exams')}</Link>
                                {/*<small className="text-muted px-2 py-1 d-block">Настройки</small>*/}
                                {/*/!*<a className="dropdown-item" href="pages-profile.html"><i*!/*/}
                                {/*/!*    className="las la-cog fs-18 me-1 align-text-bottom"></i>Account Settings</a>*!/*/}
                                {/*/!*<a className="dropdown-item" href="pages-profile.html"><i*!/*/}
                                {/*/!*    className="las la-lock fs-18 me-1 align-text-bottom"></i> Security</a>*!/*/}
                                {/*<Link className="dropdown-item" to={'/help'}><i*/}
                                {/*    className="iconoir-info-circle"></i> Центр поддержки</Link>*/}
                                <div className="dropdown-divider mb-0"></div>
                                <a className="dropdown-item text-danger" onClick={() => {
                                    user.logout()
                                }}><i
                                    className="iconoir-undo-action"></i> {t('logout')}</a>
                            </div>}
                        </li>
                    </ul>

                </nav>
            </div>
        </div>

        <div className="startbar d-print-none">
            <div className="brand">
                <Link to="/" className="logo">
          <span>
                        <img src="/st/smallDark.svg" alt="logo-small" className="logo-sm light-mode"/>
                        <img src="/st/small.svg" alt="logo-small" className="logo-sm dark-mode"/>
                    </span>
                    <LogoImgRuEn></LogoImgRuEn>
                </Link>
            </div>
            <div className="startbar-menu">
                <div className="startbar-collapse simplebar-scrollable-y" id="startbarCollapse" data-simplebar="init">
                    <div className="simplebar-wrapper" style={{margin: '0px -16px -16px'}}>
                        <div className="simplebar-height-auto-observer-wrapper">
                            <div className="simplebar-height-auto-observer"></div>
                        </div>
                        <div className="simplebar-mask">
                            <div className="simplebar-offset" style={{right: '0px', bottom: '0px'}}>
                                <div className="simplebar-content-wrapper" tabIndex="0" role="region"
                                     aria-label="scrollable content"
                                     style={{height: '100%', overflow: 'hidden scroll'}}>
                                    <div className="simplebar-content" style={{padding: '0px 16px 16px'}}>
                                        <div className="d-flex align-items-start flex-column w-100">
                                            <ul className="navbar-nav mb-auto w-100">
                                                <li className="menu-label pt-0 mt-0">
                                                    <span>{t('mainMenu')}</span>
                                                </li>
                                                {(global.CONFIG.header || []).map((it, ind) => {
                                                    let isOk = it.isVisible ? it.isVisible(it) : true;
                                                    if (!isOk) {
                                                        return null;
                                                    }
                                                    if (it.isMenu) {
                                                        return <li className="menu-label mt-2" key={ind}>
                                                            <small className="label-border">
                                                                <div className="border_left hidden-xs"></div>
                                                                <div className="border_right"></div>
                                                            </small>
                                                            <span>{t(it.name)}</span>
                                                        </li>
                                                    }
                                                    let isActive = it.isActive;
                                                    return (
                                                        <li className="nav-item" key={ind}>
                                                            <Link
                                                                to={it.url}
                                                                className={'nav-link ' + (((href.indexOf(it.url) > -1) || (isActive && isActive(href))) ? "active" : "")}
                                                                role="button" aria-expanded="false"
                                                                aria-controls="sidebarDashboards">
                                                                <i className={it.icon + "  menu-icon"}></i>
                                                                <span>{t(it.name)}</span>
                                                            </Link>
                                                        </li>
                                                    )
                                                        ;
                                                })}
                                            </ul>
                                            <div className="update-msg text-center" onClick={onOpenWhy}>
                                                <div
                                                    className="d-flex justify-content-center align-items-center thumb-lg update-icon-box  rounded-circle mx-auto">
                                                    <i className="iconoir-peace-hand h3 align-self-center mb-0 text-primary"></i>
                                                </div>
                                                <h5 className="mt-3">{t('bannerTitle1')}</h5>
                                                <p className="mb-3 text-muted">{t('bannerTitle2')}</p>

                                                <a href="javascript: void(0);"
                                                   className="btn text-primary shadow-sm rounded-pill">{t('bannerTitle3')}</a>
                                            </div>
                                            {lng === 'ru' && <a
                                                title={'ИТК с 2024 года является официальным резидентом инновационного центра Сколково!'}
                                                className="tc w100 menu-label"
                                                href={'https://navigator.sk.ru/orn/1126795'}
                                                style={{height: '30px', marginTop: '10px'}}
                                                target={"_blank"}>
                                                <img src="/st/promo/skLight.svg" alt=""
                                                     style={{height: '100%', float: 'none'}} className={'light-mode'}/>
                                                <img src="/st/promo/skDark.svg" alt=""
                                                     style={{height: '100%', float: 'none'}} className={'dark-mode'}/>
                                            </a>}

                                        </div>
                                    </div>

                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div className="startbar-overlay d-print-none" onClick={() => {
            colorTheme.toggleSize();
        }}></div>
    </>
    return (
        <div className={"headerCont " + (isMenu ? '' : 'CoursesMenu')}>
            <div className="fixcont">
                {/* {href} */}
                <div className="menuLinks animChild2">
                    {/* {new Date().getTime()} */}
                    <Link to={"/main"} className={"ib mainLogo"}>
                        {logoImg.main}
                    </Link>
                    {isMenu && (
                        <div>
                            {(global.CONFIG.header || []).map((it, ind) => {
                                let isOk = it.isVisible ? it.isVisible(it) : true;
                                if (!isOk) {
                                    return <div key={ind}></div>
                                }
                                return (
                                    <Link
                                        to={it.url}
                                        key={'ind' + ind}
                                        className={href.indexOf(it.url) > -1 ? "activeMenu" : ""}
                                    >
                                        <div className="menuItemWrapper">
                                            <div className="menuIconWrapper">
                                                <SvgIcon
                                                    component={iconsList[it.url] || iconsList.cv}
                                                    viewBox="0 0 24 24"
                                                />
                                            </div>
                                            <div>{it.name}</div>
                                        </div>
                                    </Link>
                                );
                            })}

                            <a
                                className={"ib exit"}
                                onClick={() => {
                                    user.logout();
                                }}
                            >
                                <div className="menuItemWrapper">
                                    <div className="exitIconWrapper">
                                        <SvgIcon component={iconsList.exit} viewBox="0 0 24 24"/>
                                    </div>
                                    <div>Выход</div>
                                </div>
                            </a>
                        </div>
                    )}
                </div>
                <div className={'wrapMenuEl'} style={{width: '100%'}}>
                    {Comp}
                </div>
            </div>
        </div>
    );
}

const MemoFn = React.memo(
    (props) => {
        // return <div>menu</div>
        //console.log("compare props 1.0");
        return <BasicPopover {...props}></BasicPopover>;
    },
    (p1, p2) => {
        //console.log("compare props 2.0");
        return p1.href == p2.href;
    }
);
export default MemoFn;
