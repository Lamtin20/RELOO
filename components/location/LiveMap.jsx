'use client';
import {gpsAccuracyPolygon} from '@/lib/maps/precise-location';
import {useEffect,useRef,useState,useCallback} from 'react';
import Link from 'next/link';
import {MapPin,Navigation,Maximize,Layers,SunMoon,Heart,Search} from 'lucide-react';
import {useLocale} from '@/components/settings/LocaleProvider';
import {useSavedListings} from '@/lib/hooks/useSavedListings';
import {liveMapCopy} from '@/lib/i18n/live-map';
import {applyMapDelta,approximatePoint,mapListingHref} from '@/lib/maps/spatial';
import {ListingImage} from '@/components/listings/ListingImage';
import 'maplibre-gl/dist/maplibre-gl.css';
import './live-map.css';
const EMPTY={type:'FeatureCollection',features:[]};
export function LiveMap({domain='marketplace',query='',listingIds=null,center=null,onPick=null,pointOnly=false,compact=false,precisePick=false,accuracyMeters=null,routePreview=null}){
 const {locale}=useLocale(),t=liveMapCopy[locale]||liveMapCopy['vi-VN'];
 const container=useRef(null),mapRef=useRef(null),socketRef=useRef(null),dataRef=useRef(EMPTY),queryRef=useRef(''),abortRef=useRef(null),pickRef=useRef(onPick),originRef=useRef(null);
 const [config,setConfig]=useState(null),[state,setState]=useState('loading'),[results,setResults]=useState(EMPTY),[selected,setSelected]=useState(null),[needsSearch,setNeedsSearch]=useState(false),[online,setOnline]=useState(true),[connected,setConnected]=useState(false),[view,setView]=useState('map'),[dark,setDark]=useState(false),[message,setMessage]=useState(''),[nextOffset,setNextOffset]=useState(null),[place,setPlace]=useState(''),[places,setPlaces]=useState([]),[route,setRoute]=useState(null);
 const {savedIds,toggleSaved}=useSavedListings();
 const idsKey=listingIds?JSON.stringify(listingIds.slice(0,200)):'';
 const [sheetExpanded,setSheetExpanded]=useState(true),sheetPointer=useRef(null);
 useEffect(()=>{pickRef.current=onPick},[onPick]);
 const paint=useCallback(collection=>{dataRef.current=collection;setResults(collection);mapRef.current?.getSource('reloo-listings')?.setData(collection)},[]);
 const searchArea=useCallback(async(offset=0)=>{
  const map=mapRef.current;if(!map||pointOnly)return;abortRef.current?.abort();const abort=new AbortController();abortRef.current=abort;setState('loading');
  try{
   const b=map.getBounds(),original=new URLSearchParams(query),params=new URLSearchParams();for(const key of ['q','category','transaction','min','max','ids'])if(original.has(key))params.set(key,original.get(key));if(idsKey)params.set('ids',idsKey);params.set('bbox',[b.getWest(),b.getSouth(),b.getEast(),b.getNorth()].map(x=>x.toFixed(6)).join(','));params.set('domain',domain);params.set('offset',String(offset));params.set('limit','100');
   const response=await fetch('/api/maps/search?'+params,{signal:abort.signal,cache:'no-store'}),data=await response.json();if(!response.ok||!data.ok)throw Error();
   paint(offset?{...data,features:[...new Map([...dataRef.current.features,...data.features].map(f=>[f.id,f])).values()]}:data);setNextOffset(data.nextOffset);setState('ready');setNeedsSearch(false);queryRef.current=params.toString();
   socketRef.current?.emit('map:subscribe',{query:params.toString(),cursor:data.cursor,ids:dataRef.current.features.map(f=>String(f.id)).slice(0,200)});
  }catch(error){if(error.name!=='AbortError')setState('error');}
 },[domain,query,idsKey,pointOnly,paint]);
 const searchRef=useRef(searchArea);useEffect(()=>{searchRef.current=searchArea},[searchArea]);
 useEffect(()=>{
  const abort=new AbortController();fetch('/api/maps/config',{signal:abort.signal,cache:'no-store'}).then(r=>r.json()).then(value=>{setConfig(value);if(!value.enabled)setState('unavailable')}).catch(()=>{if(!abort.signal.aborted)setState('error')});return()=>abort.abort();
 },[]);
 useEffect(()=>{
  const update=()=>setOnline(navigator.onLine);update();window.addEventListener('online',update);window.addEventListener('offline',update);return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update)};
 },[]);
 useEffect(()=>{
  if(!config?.enabled||!container.current)return;let disposed=false,map,socket;
  (async()=>{
   try{
    const library=await import('maplibre-gl');if(disposed)return;
    library.setWorkerUrl('/maps/maplibre-worker-6.16.0.mjs');
    map=new library.Map({container:container.current,style:config.style,center:center?[center.lng,center.lat]:[106.7,10.77],zoom:precisePick?17:12,pitch:precisePick?45:0,attributionControl:false});mapRef.current=map;
    map.addControl(new library.NavigationControl({visualizePitch:true}),'top-right');
    const attribution=new library.AttributionControl({customAttribution:'<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a> · '+config.attribution.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))});map.addControl(attribution,'bottom-right');
    map.on('error',()=>{if(!disposed)setMessage(t.error)});
    map.on('load',async()=>{
     if(disposed)return;
     if(config.localFonts&&map.getLayer('places'))map.setLayoutProperty('places','text-field',['coalesce',['get',locale==='en-US'?'name:en':'name:vi'],['get','name']]);
     map.addSource('reloo-listings',{type:'geojson',data:EMPTY,cluster:true,clusterRadius:48,clusterMaxZoom:15});
     map.addLayer({id:'reloo-clusters',type:'circle',source:'reloo-listings',filter:['has','point_count'],paint:{'circle-color':'#087f5b','circle-radius':22,'circle-stroke-width':3,'circle-stroke-color':'#ffffff'}});
     map.addLayer({id:'reloo-points',type:'circle',source:'reloo-listings',filter:['!', ['has','point_count']],paint:{'circle-color':'#087f5b','circle-radius':9,'circle-stroke-width':3,'circle-stroke-color':'#ffffff'}});
     if(!pointOnly&&map.getStyle().glyphs){map.addLayer({id:'reloo-labels',type:'symbol',source:'reloo-listings',layout:{'text-field':['case',['has','point_count'],['to-string',['get','point_count']],['concat',['to-string',['get','price']],' đ']],'text-size':12,...(config.localFonts?{'text-font':['Noto Sans Regular']}:{}),'text-offset':[0,1.5]},paint:{'text-color':'#173b2d','text-halo-color':'#ffffff','text-halo-width':2}});}
     map.on('click','reloo-clusters',async event=>{const feature=event.features?.[0];if(!feature)return;const zoom=await map.getSource('reloo-listings').getClusterExpansionZoom(feature.properties.cluster_id);map.easeTo({center:feature.geometry.coordinates,zoom,duration:window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:350});});
     map.on('click','reloo-points',event=>{const id=event.features?.[0]?.properties?.id;setSelected(id)});
     map.on('moveend',()=>setNeedsSearch(true));
     if(pickRef.current)map.on('click',event=>{const p={lng:event.lngLat.lng,lat:event.lngLat.lat};pickRef.current(p);const publicPoint=precisePick?p:approximatePoint(p);paint({type:'FeatureCollection',features:[{type:'Feature',id:'picked',geometry:{type:'Point',coordinates:[publicPoint.lng,publicPoint.lat]},properties:{id:'picked',price:0}}]});setMessage(t.picked)});
     if(precisePick&&config.localFonts){const vector=Object.entries(map.getStyle().sources).find(([,v])=>v.type==='vector');if(vector)map.addLayer({id:'reloo-buildings',type:'fill-extrusion',source:vector[0],'source-layer':'building',minzoom:14,paint:{'fill-extrusion-color':'#b8c9c0','fill-extrusion-height':['coalesce',['get','render_height'],['get','height'],0],'fill-extrusion-base':['coalesce',['get','render_min_height'],0],'fill-extrusion-opacity':.8}});}
     if(pointOnly){setState('ready');if(center)paint({type:'FeatureCollection',features:[{type:'Feature',id:'point',geometry:{type:'Point',coordinates:[center.lng,center.lat]},properties:{id:'point',price:0}}]});}
     else{
      const {io}=await import('socket.io-client');if(disposed)return;
      socket=io('/maps',{transports:['websocket','polling'],reconnection:true});socketRef.current=socket;
      socket.on('connect',()=>{setConnected(true);searchRef.current()});socket.on('disconnect',()=>setConnected(false));socket.on('connect_error',()=>setConnected(false));
      socket.on('map:delta',event=>{if(event.schemaVersion===1)paint(applyMapDelta(dataRef.current,event.events))});
      socket.on('map:reconcile',()=>searchRef.current());await searchRef.current();
     }
    });
   }catch(error){if(!disposed){console.warn('RELOO_MAP_INITIALIZATION_FAILED',error instanceof Error?error.message:'UNKNOWN');setState('error')}}
  })();
  return()=>{disposed=true;abortRef.current?.abort();socket?.disconnect();socketRef.current=null;map?.remove();mapRef.current=null};
 // Keep camera stable across ordinary filter/locale changes; searches reconcile separately.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[config?.enabled]);
 useEffect(()=>{const map=mapRef.current;if(!pointOnly||!center||!map)return;const render=()=>{if(!map.getSource('reloo-listings'))return;paint({type:'FeatureCollection',features:[{type:'Feature',id:'point',geometry:{type:'Point',coordinates:[center.lng,center.lat]},properties:{id:'point',price:0}}]});map.easeTo({center:[center.lng,center.lat],zoom:precisePick?17:13,duration:0});};if(map.loaded())render();else map.once('load',render);return()=>map.off('load',render);},[center,pointOnly,precisePick,paint]);
 useEffect(()=>{const map=mapRef.current;if(!precisePick||!map)return;const render=()=>{if(!map.isStyleLoaded())return;if(center&&accuracyMeters){const polygon=gpsAccuracyPolygon(center,accuracyMeters);if(map.getSource('reloo-gps-accuracy'))map.getSource('reloo-gps-accuracy').setData(polygon);else{map.addSource('reloo-gps-accuracy',{type:'geojson',data:polygon});map.addLayer({id:'reloo-gps-accuracy',type:'fill',source:'reloo-gps-accuracy',paint:{'fill-color':'#178d68','fill-opacity':.15}});}}else if(map.getSource('reloo-gps-accuracy'))map.getSource('reloo-gps-accuracy').setData(EMPTY);if(routePreview){const ends={type:'FeatureCollection',features:[routePreview.from,routePreview.to].map((p,i)=>({type:'Feature',properties:{destination:i===1},geometry:{type:'Point',coordinates:[p.lng,p.lat]}}))};if(map.getSource('reloo-route-ends'))map.getSource('reloo-route-ends').setData(ends);else{map.addSource('reloo-route-ends',{type:'geojson',data:ends});map.addLayer({id:'reloo-route-ends',type:'circle',source:'reloo-route-ends',paint:{'circle-radius':8,'circle-color':['case',['get','destination'],'#087f5b','#2463eb'],'circle-stroke-color':'#fff','circle-stroke-width':3}});}const geometry={type:'Feature',geometry:routePreview.geometry,properties:{}};if(map.getSource('reloo-private-route'))map.getSource('reloo-private-route').setData(geometry);else{map.addSource('reloo-private-route',{type:'geojson',data:geometry});map.addLayer({id:'reloo-private-route-halo',type:'line',source:'reloo-private-route',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#ffffff','line-width':10}});map.addLayer({id:'reloo-private-route',type:'line',source:'reloo-private-route',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#087f5b','line-width':6}});}map.fitBounds([[Math.min(routePreview.from.lng,routePreview.to.lng),Math.min(routePreview.from.lat,routePreview.to.lat)],[Math.max(routePreview.from.lng,routePreview.to.lng),Math.max(routePreview.from.lat,routePreview.to.lat)]],{padding:65,maxZoom:17,pitch:45,duration:0});}else{if(map.getSource('reloo-private-route'))map.getSource('reloo-private-route').setData(EMPTY);if(map.getSource('reloo-route-ends'))map.getSource('reloo-route-ends').setData(EMPTY);}};if(map.isStyleLoaded())render();else map.once('load',render);return()=>map.off('load',render);},[precisePick,center,accuracyMeters,routePreview]);
 useEffect(()=>{if(mapRef.current?.loaded()&&!pointOnly)searchArea()},[searchArea,pointOnly]);
 useEffect(()=>{const map=mapRef.current;if(config?.localFonts&&map?.getLayer('places'))map.setLayoutProperty('places','text-field',['coalesce',['get',locale==='en-US'?'name:en':'name:vi'],['get','name']]);},[locale,config?.localFonts]);
 useEffect(()=>{const map=mapRef.current;if(!config?.localFonts||!map?.isStyleLoaded())return;for(const [layer,property,light,night] of [['background','background-color','#f3f5ef','#172e24'],['landcover','fill-color','#dce8d5','#1e392a'],['water','fill-color','#bfdce9','#193c4b'],['roads','line-color','#ffffff','#536d60'],['places','text-color','#345444','#ddf4e5']])if(map.getLayer(layer))map.setPaintProperty(layer,property,dark?night:light)},[dark,config?.localFonts]);
 useEffect(()=>{
  if(place.trim().length<3)return;const abort=new AbortController(),timer=setTimeout(()=>{fetch('/api/maps/places',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({q:place,locale}),signal:abort.signal}).then(r=>r.json()).then(d=>{if(!abort.signal.aborted)setPlaces(d.places||[])}).catch(()=>{})},400);
  return()=>{clearTimeout(timer);abort.abort()};
 },[place,locale]);
 function locate(){
  if(precisePick){setMessage(locale==='en-US'?'Use the location permission button above.':'Bam nut GPS phia tren de kiem tra sai so.');return;}if(!navigator.geolocation){setMessage(t.denied);return;}
  navigator.geolocation.getCurrentPosition(result=>{const p={lat:result.coords.latitude,lng:result.coords.longitude};originRef.current=p;mapRef.current?.easeTo({center:[p.lng,p.lat],zoom:13,duration:0});if(pickRef.current)pickRef.current(p);setMessage('')},()=>setMessage(t.denied),{enableHighAccuracy:false,timeout:10000,maximumAge:60000});
 }
 async function previewRoute(feature){if(!originRef.current){setMessage(t.locate);return;}try{const response=await fetch('/api/maps/route',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({from:originRef.current,to:{lng:feature.geometry.coordinates[0],lat:feature.geometry.coordinates[1]},mode:'driving',approximateDestination:true})}),data=await response.json();if(!response.ok)throw Error();setRoute(data);const map=mapRef.current;const geo={type:'Feature',geometry:data.geometry,properties:{}};if(map.getSource('reloo-route'))map.getSource('reloo-route').setData(geo);else{map.addSource('reloo-route',{type:'geojson',data:geo});map.addLayer({id:'reloo-route',type:'line',source:'reloo-route',paint:{'line-color':'#225fad','line-width':4}})}}catch{setMessage(t.error)}}
 function buildings(){const map=mapRef.current;if(!map)return;if(map.getLayer('reloo-buildings')){map.setLayoutProperty('reloo-buildings','visibility',map.getLayoutProperty('reloo-buildings','visibility')==='none'?'visible':'none');return;}const source=Object.entries(map.getStyle().sources).find(([,value])=>value.type==='vector');if(!source){setMessage(t.error);return;}map.addLayer({id:'reloo-buildings',type:'fill-extrusion',source:source[0],'source-layer':'building',minzoom:14,paint:{'fill-extrusion-color':'#ccdcd1','fill-extrusion-height':['coalesce',['get','render_height'],['get','height'],0],'fill-extrusion-opacity':.7}});map.easeTo({pitch:45,duration:0});}
 const current=results.features.find(f=>f.id===selected)||null;
 return <section className={'reloo-live-map'+(compact?' reloo-live-map--compact':'')+(dark?' reloo-live-map--dark':'')} aria-label={t.title}>
  <div className="rlm-toolbar"><strong><MapPin size={18}/>{onPick?t.selection:t.title}</strong><div><button type="button" aria-pressed={view==='map'} onClick={()=>setView(view==='map'?'list':'map')}>{view==='map'?t.list:t.map}</button><button type="button" aria-label={t.dark} onClick={()=>setDark(!dark)}><SunMoon size={18}/></button><button type="button" aria-label={t.fullscreen} onClick={()=>{const el=container.current?.closest('section');if(document.fullscreenElement)document.exitFullscreen?.();else el?.requestFullscreen?.()}}><Maximize size={18}/></button></div></div>
  {!online&&<p role="status">{t.offline}</p>}
  {config?.enabled&&<div className="rlm-controls"><label><Search size={17}/><span className="sr-only">{t.places}</span><input value={place} onChange={event=>{setPlace(event.target.value);setPlaces([])}} placeholder={t.places} disabled={!config.geocoding}/></label><button type="button" onClick={locate} aria-label={t.locate}><Navigation size={18}/></button><button type="button" onClick={buildings} aria-label={t.threeD}><Layers size={18}/></button></div>}
  {place.trim().length>=3&&!!places.length&&<ul className="rlm-places">{places.map((p,index)=><li key={index}><button type="button" onClick={()=>{mapRef.current?.easeTo({center:[p.coords.lng,p.coords.lat],zoom:13,duration:0});setPlace('');setPlaces([]);if(pickRef.current)pickRef.current(p.coords)}}>{p.label}</button></li>)}</ul>}
  <div className={'rlm-layout rlm-layout--'+view}>
   <div className="rlm-map-wrap"><div ref={container} className="rlm-canvas" role="region" aria-label={t.map}/>{needsSearch&&config?.enabled&&!pointOnly&&<button type="button" className="rlm-search-area" onClick={()=>searchArea()}>{t.search}</button>}
   {state!=='ready'&&<div className="rlm-status" role="status">{state==='unavailable'?t.unavailable:state==='error'?t.error:t.loading}{state==='error'&&<button type="button" onClick={()=>searchArea()}>{t.retry}</button>}</div>}</div>
   {!pointOnly&&<div className="rlm-list" aria-label={t.list}><p className="rlm-caption">{config?.domains?.[domain]!=='AVAILABLE'?t.blocked:t.approximate}</p>{state==='ready'&&!results.features.length&&<p role="status">{t.empty}</p>}{results.features.map(feature=><article key={feature.id} className={selected===feature.id?'is-selected':''}><button type="button" onClick={()=>{setSelected(feature.id);mapRef.current?.easeTo({center:feature.geometry.coordinates,zoom:15,duration:0})}}><strong>{feature.properties.title}</strong><span>{feature.properties.area}</span><b>{feature.properties.price.toLocaleString(locale)} ₫ <small>{(locale==='en-US'?{DAY:'/ day',WEEK:'/ week',MONTH:'/ month'}:{DAY:'/ ngày',WEEK:'/ tuần',MONTH:'/ tháng'})[feature.properties.unit]||''}</small></b></button><Link href={feature.properties.href}>{t.view}</Link>{feature.properties.domain==='marketplace'&&<button type="button" className="rlm-save" aria-label={t.favorite} aria-pressed={savedIds.includes(feature.id.replace('marketplace:',''))} onClick={()=>toggleSaved(feature.id.replace('marketplace:',''))}><Heart size={17}/></button>}</article>)}{nextOffset!==null&&<button type="button" onClick={()=>searchArea(nextOffset)}>{t.more}</button>}</div>}
  </div>
  {current&&<div className={'rlm-preview'+(sheetExpanded?' is-expanded':'')} onPointerDown={event=>{sheetPointer.current=event.clientY}} onPointerUp={event=>{if(sheetPointer.current!==null&&Math.abs(event.clientY-sheetPointer.current)>40)setSheetExpanded(event.clientY<sheetPointer.current);sheetPointer.current=null}}><button type="button" className="rlm-sheet-handle" aria-expanded={sheetExpanded} aria-label={t.view} onClick={()=>setSheetExpanded(!sheetExpanded)}>—</button>{sheetExpanded&&current.properties.image&&<ListingImage images={[current.properties.image]} alt={current.properties.title} className="rlm-preview-image"/>}<div><strong>{current.properties.title}</strong>{sheetExpanded&&<p>{current.properties.area}</p>}</div><Link href={mapListingHref(current,query)}>{t.view}</Link>{sheetExpanded&&config.routing&&<button type="button" onClick={()=>previewRoute(current)}>{t.route}</button>}</div>}
  {precisePick&&accuracyMeters&&<p role="status">GPS: ±{Math.round(accuracyMeters)} m</p>}{route&&<p role="status">{Math.round(route.distanceMeters)} m · {Math.ceil(route.durationSeconds/60)} min. {t.routeNote}</p>}
  {message&&<p role="status">{message}</p>}
  {config?.enabled&&!pointOnly&&<p className="rlm-caption" role="status">{connected?t.realtime:t.disconnected}</p>}
 </section>;
}




