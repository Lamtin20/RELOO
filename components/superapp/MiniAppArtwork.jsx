// Original decorative RELOO scenes. No external images or runtime animation.
export function MiniAppArtwork({id}){
 return <div className={'sa-destination-art sa-destination-art--'+id} aria-hidden="true"><svg viewBox="0 0 240 142" fill="none" focusable="false">
  {id==='stays'&&<>
   <path d="M45 104V28a8 8 0 0 1 8-8h135a8 8 0 0 1 8 8v76" fill="#fff" fillOpacity=".65"/>
   <rect x="133" y="30" width="43" height="45" rx="5" fill="#B5DFD2"/><path d="M154 31v43m-20-22h41" stroke="#fff" strokeWidth="3"/>
   <circle cx="165" cy="41" r="6" fill="#FFF1BD"/>
   <ellipse cx="121" cy="119" rx="91" ry="8" fill="#135B49" fillOpacity=".1"/>
   <path d="M59 81V62a9 9 0 0 1 9-9h53a9 9 0 0 1 9 9v19" fill="#478D77"/>
   <path d="m53 82 66-3 44 24H53z" fill="#fff"/>
   <rect x="65" y="64" width="26" height="16" rx="5" fill="#E7F4EF"/><rect x="94" y="64" width="26" height="16" rx="5" fill="#E7F4EF"/>
   <path d="M49 91a6 6 0 0 1 6-6h76l34 16v13H49z" fill="#168365"/><path d="m107 85 29 3 29 13h-58z" fill="#69BCA1"/>
   <path d="M57 114v6m100-6v6" stroke="#245D4B" strokeWidth="5" strokeLinecap="round"/>
   <path d="M188 100V76m0 14c-15-1-19-12-15-15 8-4 15 4 15 15m0-5c0-14 12-20 16-16 4 7-5 16-16 16" stroke="#478D77" strokeWidth="3" fill="#81B79E" strokeLinejoin="round"/>
   <path d="M177 99h22l-3 18h-16z" fill="#D7B184"/>
  </>}
  {id==='jobs'&&<>
   <ellipse cx="120" cy="120" rx="84" ry="8" fill="#26598B" fillOpacity=".1"/>
   <rect x="62" y="36" width="92" height="69" rx="7" fill="#fff"/><rect x="68" y="42" width="80" height="55" rx="3" fill="#B8D3F0"/>
   <path d="M52 105h111l9 10H44z" fill="#6293C7"/><path d="M94 105h27l4 5H90z" fill="#D3E4F6"/>
   <rect x="91" y="28" width="70" height="63" rx="7" fill="#F9FCFF" stroke="#D4E2F3" strokeWidth="2"/>
   <rect x="111" y="23" width="30" height="11" rx="4" fill="#326AA7"/>
   <path d="m103 48 3 3 6-7m-9 21 3 3 6-7m8-12h26m-26 17h21" stroke="#5888B9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
   <rect x="135" y="81" width="54" height="36" rx="7" fill="#326AA7"/><path d="M153 81v-6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v6m-36 14c18 9 36 9 54 0" stroke="#326AA7" strokeWidth="4"/>
   <path d="M138 96c16 7 32 7 48 0" stroke="#8CB5DF" strokeWidth="2"/><rect x="159" y="96" width="7" height="9" rx="2" fill="#E9F2FC"/>
   <circle cx="53" cy="39" r="12" fill="#fff"/><path d="M53 32v8l5 3" stroke="#326AA7" strokeWidth="2" strokeLinecap="round"/>
  </>}
  {id==='rentals'&&<>
   <ellipse cx="120" cy="120" rx="85" ry="8" fill="#246653" fillOpacity=".1"/>
   <path d="M45 78V65a22 22 0 0 1 44 0v13" stroke="#6CAA8F" strokeWidth="9"/>
   <rect x="37" y="74" width="15" height="28" rx="6" fill="#2D6F58"/><rect x="81" y="74" width="15" height="28" rx="6" fill="#2D6F58"/>
   <path d="m101 52 7-14h32l8 14" fill="#2A6454"/>
   <rect x="78" y="51" width="105" height="65" rx="12" fill="#174F41"/><path d="M80 72h101v30H80z" fill="#397A66"/>
   <circle cx="130" cy="84" r="29" fill="#D1E7DC"/><circle cx="130" cy="84" r="23" fill="#173E36"/><circle cx="130" cy="84" r="15" fill="#448F7B"/>
   <circle cx="125" cy="79" r="5" fill="#C0E6D5"/><rect x="157" y="59" width="16" height="9" rx="3" fill="#E3F0E9"/>
   <path d="M186 58h15l-5 43h-10" fill="#D5B785"/><path d="M191 48v12m-6-6h12" stroke="#B2915C" strokeWidth="3" strokeLinecap="round"/>
  </>}
  {id==='used'&&<>
   <ellipse cx="121" cy="120" rx="86" ry="8" fill="#805D27" fillOpacity=".1"/>
   <path d="M75 89V53a17 17 0 0 1 17-17h37a17 17 0 0 1 17 17v36" fill="#D6AC69"/>
   <rect x="80" y="48" width="61" height="40" rx="12" fill="#E7C58C"/>
   <rect x="69" y="82" width="84" height="25" rx="10" fill="#B88744"/>
   <rect x="61" y="73" width="19" height="35" rx="9" fill="#C99B58"/><rect x="142" y="73" width="19" height="35" rx="9" fill="#C99B58"/>
   <path d="m76 108-3 10m74-10 3 10" stroke="#7C5E3D" strokeWidth="5" strokeLinecap="round"/>
   <rect x="100" y="59" width="31" height="28" rx="7" transform="rotate(10 100 59)" fill="#FFF1D8"/>
   <path d="M187 100V67m0 17c-15-1-20-12-16-16 9-3 16 5 16 16m0-6c0-14 13-21 17-16 3 8-6 16-17 16" stroke="#789174" strokeWidth="3" fill="#A5B69A" strokeLinejoin="round"/>
   <path d="M176 98h23l-4 19h-15z" fill="#C99370"/>
   <path d="m46 46 5 5 10-11" stroke="#A77D40" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
  </>}
 </svg></div>;
}
