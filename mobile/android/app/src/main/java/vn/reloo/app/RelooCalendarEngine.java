package vn.reloo.app;
import android.Manifest;
import android.content.*;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.provider.CalendarContract;
import androidx.core.content.ContextCompat;
import org.json.*;
import java.security.MessageDigest;
import java.text.SimpleDateFormat;
import java.util.*;

/** Calendar metadata and exact RELOO-marker events only. No personal event export. */
final class RelooCalendarEngine {
 private static final Object LOCK=new Object();
 static SharedPreferences prefs(Context c){return c.getSharedPreferences("reloo-calendar",Context.MODE_PRIVATE);}
 static void bind(Context c,String account,boolean enabled){synchronized(LOCK){prefs(c).edit().putString("account",account).putBoolean("enabled",enabled).commit();}}
 static boolean granted(Context c){return ContextCompat.checkSelfPermission(c,Manifest.permission.READ_CALENDAR)==PackageManager.PERMISSION_GRANTED&&ContextCompat.checkSelfPermission(c,Manifest.permission.WRITE_CALENDAR)==PackageManager.PERMISSION_GRANTED;}
 static String device(Context c){synchronized(LOCK){String id=prefs(c).getString("device",null);if(id==null){id=UUID.randomUUID().toString();prefs(c).edit().putString("device",id).commit();}return id;}}
 static JSONArray calendars(Context c)throws Exception{
  if(!granted(c))throw new Exception("REAUTH");JSONArray result=new JSONArray();
  try(Cursor cursor=c.getContentResolver().query(CalendarContract.Calendars.CONTENT_URI,new String[]{"_id","calendar_displayName"},"account_type=? AND calendar_access_level>=?",new String[]{CalendarContract.ACCOUNT_TYPE_LOCAL,String.valueOf(CalendarContract.Calendars.CAL_ACCESS_CONTRIBUTOR)},null)){
   if(cursor!=null)while(cursor.moveToNext())result.put(new JSONObject().put("id",String.valueOf(cursor.getLong(0))).put("name",cursor.getString(1)));}return result;
 }
 static String hash(String value)throws Exception{byte[] digest=MessageDigest.getInstance("SHA-256").digest(value.getBytes(java.nio.charset.StandardCharsets.UTF_8));StringBuilder hex=new StringBuilder();for(byte b:digest)hex.append(String.format(Locale.ROOT,"%02x",b));return hex.toString();}
 static JSONObject ensureCalendar(Context c,String account)throws Exception{synchronized(LOCK){
  if(!granted(c))throw new Exception("REAUTH");if(account==null||!account.matches("[a-zA-Z0-9_-]{1,150}"))throw new Exception("FORBIDDEN");
  String name="reloo-"+hash(account),id=null;
  try(Cursor cursor=c.getContentResolver().query(CalendarContract.Calendars.CONTENT_URI,new String[]{"_id"},"name=? AND account_type=? AND account_name=?",new String[]{name,CalendarContract.ACCOUNT_TYPE_LOCAL,"RELOO"},null)){if(cursor!=null&&cursor.moveToFirst()){id=String.valueOf(cursor.getLong(0));if(cursor.moveToNext())throw new Exception("CALENDAR_REVIEW");}}
  if(id==null){ContentValues values=new ContentValues();values.put(CalendarContract.Calendars.ACCOUNT_NAME,"RELOO");values.put(CalendarContract.Calendars.ACCOUNT_TYPE,CalendarContract.ACCOUNT_TYPE_LOCAL);values.put(CalendarContract.Calendars.NAME,name);values.put(CalendarContract.Calendars.CALENDAR_DISPLAY_NAME,"RELOO");values.put(CalendarContract.Calendars.OWNER_ACCOUNT,"RELOO");values.put(CalendarContract.Calendars.CALENDAR_ACCESS_LEVEL,CalendarContract.Calendars.CAL_ACCESS_OWNER);values.put(CalendarContract.Calendars.CALENDAR_COLOR,0xff087f5b);values.put(CalendarContract.Calendars.VISIBLE,1);values.put(CalendarContract.Calendars.SYNC_EVENTS,1);values.put(CalendarContract.Calendars.CALENDAR_TIME_ZONE,"Asia/Ho_Chi_Minh");
   Uri uri=CalendarContract.Calendars.CONTENT_URI.buildUpon().appendQueryParameter(CalendarContract.CALLER_IS_SYNCADAPTER,"true").appendQueryParameter(CalendarContract.Calendars.ACCOUNT_NAME,"RELOO").appendQueryParameter(CalendarContract.Calendars.ACCOUNT_TYPE,CalendarContract.ACCOUNT_TYPE_LOCAL).build();Uri created=c.getContentResolver().insert(uri,values);if(created==null)throw new Exception("CALENDAR_FAILED");id=String.valueOf(ContentUris.parseId(created));}
  return new JSONObject().put("device",device(c)).put("independent",true).put("calendar",new JSONObject().put("id",id).put("name","RELOO"));
 }}
 private static long time(String raw)throws Exception{String value=raw.replace("Z","+0000").replaceFirst("([+-]\\d{2}):(\\d{2})$","$1$2");value=value.replaceFirst("\\.(\\d{3})\\d+",".$1");if(!value.contains("."))value=value.replaceFirst("([+-]\\d{4})$",".000$1");SimpleDateFormat parser=new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSZ",Locale.ROOT);parser.setLenient(false);return parser.parse(value).getTime();}
 static String sync(Context c,String account,JSONObject job)throws Exception{synchronized(LOCK){
  if(!granted(c))throw new Exception("REAUTH");
  if(account==null||!account.equals(prefs(c).getString("account",""))||!prefs(c).getBoolean("enabled",false)||!account.equals(job.getString("profile")))throw new Exception("FORBIDDEN");
  long calendar=Long.parseLong(job.getString("calendar"));boolean valid=false;JSONArray choices=calendars(c);for(int i=0;i<choices.length();i++)if(choices.getJSONObject(i).getString("id").equals(String.valueOf(calendar)))valid=true;if(!valid)throw new Exception("CALENDAR_REVIEW");
  String legacyKey=hash("reloo-calendar:"+job.getString("connection")+":"+job.getString("source")+":"+job.getString("rental")),key=hash("reloo-calendar-v2:"+account+":"+job.getString("source")+":"+job.getString("rental")),marker="reloo://calendar-event/v2/"+key,localKey="map:"+hash(account+":"+calendar+":"+key);long id=prefs(c).getLong(localKey,-1);ContentResolver resolver=c.getContentResolver();
  if(id>=0){try(Cursor cursor=resolver.query(ContentUris.withAppendedId(CalendarContract.Events.CONTENT_URI,id),new String[]{"calendar_id","customAppUri"},null,null,null)){if(cursor==null||!cursor.moveToFirst())id=-1;else if(cursor.getLong(0)!=calendar||!marker.equals(cursor.getString(1)))throw new Exception("CALENDAR_REVIEW");}}
  if(id<0){try(Cursor cursor=resolver.query(CalendarContract.Events.CONTENT_URI,new String[]{"_id"},"calendar_id=? AND customAppPackage=? AND customAppUri=?",new String[]{String.valueOf(calendar),c.getPackageName(),marker},null)){if(cursor!=null&&cursor.moveToFirst()){id=cursor.getLong(0);if(cursor.moveToNext())throw new Exception("CALENDAR_REVIEW");}}}
  String ownedMarker=marker;
  if(id<0){String oldMarker="reloo://calendar-event/"+legacyKey;try(Cursor cursor=resolver.query(CalendarContract.Events.CONTENT_URI,new String[]{"_id"},"calendar_id=? AND customAppPackage=? AND customAppUri=?",new String[]{String.valueOf(calendar),c.getPackageName(),oldMarker},null)){if(cursor!=null&&cursor.moveToFirst()){id=cursor.getLong(0);ownedMarker=oldMarker;if(cursor.moveToNext())throw new Exception("CALENDAR_REVIEW");}}}
  String state=job.getString("state");boolean returned=state.equals("RETURNED"),remove=state.equals("CANCELLED")||(returned&&job.optString("returnAction").equals("DELETE"));
  if(remove){if(id>=0)resolver.delete(ContentUris.withAppendedId(CalendarContract.Events.CONTENT_URI,id),"calendar_id=? AND customAppUri=?",new String[]{String.valueOf(calendar),ownedMarker});prefs(c).edit().remove(localKey).commit();return id<0?key:String.valueOf(id);}
  if(id<0&&returned)return key;
  boolean en=job.optString("locale","vi-VN").equals("en-US");long due=time(job.getString("end"));ContentValues v=new ContentValues();
  v.put(CalendarContract.Events.CALENDAR_ID,calendar);v.put(CalendarContract.Events.TITLE,returned?(en?"Returned · RELOO":"Đã trả đồ · RELOO"):(en?"Return reminder · RELOO":"Nhắc trả đồ · RELOO"));
  v.put(CalendarContract.Events.DESCRIPTION,(en?"Open RELOO to check the current rental.":"Mở RELOO để xem đơn và hạn trả hiện tại.")+"\nRELOO:"+key);v.put(CalendarContract.Events.DTSTART,due-900000);v.put(CalendarContract.Events.DTEND,due);v.put(CalendarContract.Events.EVENT_TIMEZONE,"Asia/Ho_Chi_Minh");v.put(CalendarContract.Events.CUSTOM_APP_PACKAGE,c.getPackageName());v.put(CalendarContract.Events.CUSTOM_APP_URI,marker);v.put(CalendarContract.Events.HAS_ALARM,returned?0:1);
  if(id<0){Uri created=resolver.insert(CalendarContract.Events.CONTENT_URI,v);if(created==null)throw new Exception("CALENDAR_FAILED");id=ContentUris.parseId(created);prefs(c).edit().putLong(localKey,id).commit();}
  else if(resolver.update(ContentUris.withAppendedId(CalendarContract.Events.CONTENT_URI,id),v,"calendar_id=? AND customAppUri=?",new String[]{String.valueOf(calendar),ownedMarker})!=1)throw new Exception("CALENDAR_REVIEW");
  resolver.delete(CalendarContract.Reminders.CONTENT_URI,"event_id=?",new String[]{String.valueOf(id)});
  if(!returned)for(int minutes:new int[]{1440,60}){ContentValues alarm=new ContentValues();alarm.put(CalendarContract.Reminders.EVENT_ID,id);alarm.put(CalendarContract.Reminders.MINUTES,minutes);alarm.put(CalendarContract.Reminders.METHOD,CalendarContract.Reminders.METHOD_ALERT);if(resolver.insert(CalendarContract.Reminders.CONTENT_URI,alarm)==null)throw new Exception("CALENDAR_FAILED");}return String.valueOf(id);
 }}
}
