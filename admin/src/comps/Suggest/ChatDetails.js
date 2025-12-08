import React, {useState} from 'react';
import './ChatDetails.css'

function Layout2(props) {
 //console.log('*........ ## ROOT RENDER', props);


  // let v = useActionData();
  return <div>
      <div className="chat-box-right ">
          <div className="p-3 d-flex justify-content-between card-bg rounded">
              <a href="" className="d-flex align-self-center">
                  <div className="flex-shrink-0">
                      <img src="/st/avatars/avatar-1.jpg" alt="user" className="rounded-circle thumb-lg"/>
                  </div>

                  <div className="flex-grow-1 ms-2 align-self-center">
                      <div>
                          <h6 className="my-0 fw-medium text-dark fs-14">Mary Schneider</h6>
                          <p className="text-muted mb-0">Last seen: 2 hours ago</p>
                      </div>
                  </div>

              </a>
              <div className="d-none d-sm-inline-block align-self-center">
                  {/*<a href="" className="me-2 text-muted" data-bs-toggle="tooltip" data-bs-placement="top"*/}
                  {/*   data-bs-title="Call" data-bs-custom-class="tooltip-primary"><i className="iconoir-phone fs-22"></i></a>*/}
                  {/*<a href="" className="me-2 text-muted" data-bs-toggle="tooltip" data-bs-placement="top"*/}
                  {/*   data-bs-title="Video call" data-bs-custom-class="tooltip-primary"><i*/}
                  {/*    className="iconoir-video-camera fs-22"></i></a>*/}
                  <a href="" className="me-2 text-muted" data-bs-toggle="tooltip" data-bs-placement="top"
                     data-bs-title="Delete" data-bs-custom-class="tooltip-primary"><i
                      className="iconoir-xmarl fs-22"></i></a>
                  <a href="" className="text-muted"><i className="iconoir-menu-scale fs-22"></i></a>
              </div>
          </div>
          
          <div className="chat-body simplebar-scrollable-y" data-simplebar="init">
              <div className="simplebar-wrapper" style={{margin: '-16px'}}>
                  <div className="simplebar-height-auto-observer-wrapper">
                      <div className="simplebar-height-auto-observer"></div>
                  </div>
                  <div className="simplebar-mask chat-mask">
                      <div className="simplebar-offset" style={{right: '0px', bottom: '0px'}}>
                          <div className="simplebar-content-wrapper" tabIndex="0" role="region"
                               aria-label="scrollable content" style={{"height": '100%', overflow:'hidden scroll'}}>
                              <div className="simplebar-content" style={{padding: '16px'}}>
                                  <div className="chat-detail">
                                      <div className="d-flex">
                                          <img src="/st/avatars/avatar-1.jpg" alt="user"
                                               className="rounded-circle thumb-md"/>
                                          <div className="ms-1 chat-box w-100">
                                              <div className="user-chat">
                                                  <p className="">Good Morning !</p>
                                                  <p className="">There are many variations of passages of Lorem Ipsum
                                                      available.</p>
                                              </div>
                                              <div className="chat-time">yesterday</div>
                                          </div>
                                          
                                      </div>
                                      
                                      <div className="d-flex flex-row-reverse">
                                          <img src="/st/avatars/0.png" alt="user"
                                               className="rounded-circle thumb-md"/>
                                          <div className="me-1 chat-box w-100 reverse">
                                              <div className="user-chat">
                                                  <p className="">Hi,</p>
                                                  <p className="">Can be verified on any platform using docker?</p>
                                              </div>
                                              <div className="chat-time">12:35pm</div>
                                          </div>
                                          
                                      </div>
                                      
                                      <div className="d-flex">
                                          <img src="/st/avatars/avatar-1.jpg" alt="user"
                                               className="rounded-circle thumb-md"/>
                                          <div className="ms-1 chat-box w-100">
                                              <div className="user-chat">
                                                  <p className="">Have a nice day !</p>
                                                  <p className="">Command was run with root privileges. I'm sure about
                                                      that.</p>
                                                  <p className="">ok</p>
                                              </div>
                                              <div className="chat-time">11:10pm</div>
                                          </div>
                                          
                                      </div>
                                      
                                      <div className="d-flex flex-row-reverse">
                                          <img src="/st/avatars/0.png" alt="user"
                                               className="rounded-circle thumb-md"/>
                                          <div className="me-1 chat-box w-100 reverse">
                                              <div className="user-chat">
                                                  <p className="">Thanks for your message David. I thought I'm alone
                                                      with this issue. Please, 👍 the issue to support it :)</p>
                                              </div>
                                              <div className="chat-time">10:10pm</div>
                                          </div>
                                          
                                      </div>
                                      
                                      <div className="d-flex">
                                          <img src="/st/avatars/avatar-1.jpg" alt="user"
                                               className="rounded-circle thumb-md"/>
                                          <div className="ms-1 chat-box w-100">
                                              <div className="user-chat">
                                                  <p className="">Sorry, I just back !</p>
                                                  <p className="">It seems like you are from Mac OS world. There is no
                                                      /Users/ folder on linux 😄</p>
                                              </div>
                                              <div>
                                                  {([0, 1, 2, 3] || []).map((it, ind) => {
                                                      return (<div key={ind} className={'w100'}>
                                                          <button className="btn btn-sm btn-light w100 tl actionChatBtn" >
                                                              <strong>{ind + 1}. </strong>asdf as;dkf
                                                              jas;dkfj a;sdkj a;sdkf a;sdkf as;dkj as;dkjas;kdjas;dkf j
                                                              jas;dkfj a;sdkj a;sdkf a;sdkf as;dkj as;dkjas;kdjas;dkf j
                                                              jas;dkfj a;sdkj a;sdkf a;sdkf as;dkj as;dkjas;kdjas;dkf j
                                                          </button>
                                                      </div>)
                                                  })}
                                              </div>
                                              <div className="chat-time">11:15am</div>
                                          </div>
                                          
                                      </div>
                                      
                                      <div className="d-flex flex-row-reverse">
                                          <img src="/st/avatars/0.png" alt="user"
                                               className="rounded-circle thumb-md"/>
                                          <div className="me-1 chat-box w-100 reverse">
                                              <div className="user-chat">
                                                  <p className="">Good Morning !</p>
                                                  <p className="">There are many variations of passages of Lorem Ipsum
                                                      available.</p>
                                              </div>
                                              <div className="chat-time">9:02am</div>
                                          </div>
                                          
                                      </div>
                                      
                                  </div>
                                  
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="simplebar-placeholder" ></div>
              </div>
          </div>
          
          <div className="chat-footer">
              <div className="row">
                  <div className="col-1 col-md-1">
                      <button className={'btn btn-sm btn-primary'}>
                          <span className="iconoir-menu"></span>
                      </button>
                  </div>
                  <div className="col-md-9">
                      <input type="text" className="form-control" placeholder="Type something here..."/>
                  </div>

                  <div className="col-md-2 text-end">
                      <div className="d-none d-sm-inline-block chat-features">
                          {/*<a href=""><i className="iconoir-camera"></i></a>*/}
                          {/*<a href=""><i className="iconoir-attachment"></i></a>*/}
                          <a href=""><i className="iconoir-microphone"></i></a>
                          <a href="" className="text-primary"><i className="iconoir-send-solid"></i></a>
                      </div>
                  </div>

              </div>

          </div>

      </div>
  </div>
}

export default Layout2
