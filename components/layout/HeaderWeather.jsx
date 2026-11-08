"use client";
import {useEffect,useState} from 'react';
import {Sun,Moon,CloudSun,Cloud,CloudRain,Snowflake} from 'lucide-react';
import {useLocale} from '@/components/settings/LocaleProvider';
const icons={sun:Sun,'partly-cloudy':CloudSun,cloud:Cloud,rain:CloudRain,snow:Snowflake};
export function HeaderWeather({compact=false}){
 const {locale}=useLocale(),en=locale==='en-US';
 const [weather,setWeather]=useState(null),[hour,setHour]=useState(null);
 useEffect(()=>{
  const controller=new AbortController();
  fetch('/api/weather',{signal:controller.signal}).then(r=>r.json()).then(d=>{if(d.ok&&Number.isFinite(d.temperature)&&icons[d.condition])setWeather(d);}).catch(()=>{});
  const update=()=>setHour(Number(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',hourCycle:'h23'}).format(new Date())));
  update();const timer=setInterval(update,60000);
  return()=>{controller.abort();clearInterval(timer)};
 },[]);
 const period=hour===null?'unknown':hour<6||hour>=18?'night':hour<11?'morning':'day';
 const Icon=weather?(period==='night'&&weather.condition==='sun'?Moon:icons[weather.condition]):period==='night'?Moon:Cloud;
 const unavailable=en?'Weather unavailable':'Chưa có dữ liệu thời tiết';
 const title=weather?`${en?'Ho Chi Minh City forecast':'Dự báo TP.HCM'} · Windy · ${new Date(weather.forecastAt).toLocaleString(locale)}`:unavailable;
 return <div className={'header-weather'+(compact?' header-weather--compact':'')} data-period={period} data-weather={weather?.condition||'unknown'} title={title}>
  {compact&&<span className="header-weather__city">TP.HCM <small>{en?'Local forecast':'Dự báo khu vực'}</small></span>}
  <span className="header-weather__reading"><Icon size={compact?20:19} aria-hidden="true"/><span>{weather?`${weather.temperature} °C`:compact?(en?'No forecast':'Chưa có dự báo'):'— °C'}</span>{weather&&<a href="https://www.windy.com/" target="_blank" rel="noopener noreferrer">Windy</a>}</span>
  {!weather&&<span className="sr-only">{unavailable}</span>}
 </div>;
}
