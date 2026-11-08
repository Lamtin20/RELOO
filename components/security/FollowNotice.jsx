"use client";
import {useEffect,useState} from 'react';
export function FollowNotice(){const [show,setShow]=useState(false);useEffect(()=>{const onError=()=>setShow(true);window.addEventListener('reloo-follow-error',onError);return()=>window.removeEventListener('reloo-follow-error',onError);},[]);return show?<div className="short-message" role="alert" style={{position:'fixed',bottom:100,left:16,right:16,zIndex:5000}}>Chưa lưu được lựa chọn trên tài khoản. Vui lòng thử lại.<button aria-label="Đóng thông báo" onClick={()=>setShow(false)}>×</button></div>:null;}
