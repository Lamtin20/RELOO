'use client';
export function TimeField({value,...props}){return <span className="rental-time-field"><span aria-hidden="true">{value||'hh:mm'}</span><input {...props} type="time" value={value}/></span>;}
