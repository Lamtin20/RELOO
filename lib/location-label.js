// Display only: keep official names intact in stored locations and API filters.
export function locationLabel(value=''){
 return String(value??'').replace(/thành phố\s+/giu,'TP. ');
}
