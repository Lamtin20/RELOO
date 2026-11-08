package vn.reloo.app;
import android.app.job.*;
import android.webkit.CookieManager;
import org.json.*;
import java.net.*;
import java.io.*;
/** Best effort OS jobs; fixed RELOO origin, no copied or logged login token. */
public class RelooCalendarJob extends JobService {
 private volatile boolean stopped;
 private JSONObject post(JSONObject body)throws Exception{
  HttpURLConnection c=(HttpURLConnection)new URL("https://reloo.vn/api/rental-care").openConnection();c.setInstanceFollowRedirects(false);c.setConnectTimeout(15000);c.setReadTimeout(15000);c.setRequestMethod("POST");c.setDoOutput(true);c.setRequestProperty("Content-Type","application/json");c.setRequestProperty("Origin","https://reloo.vn");c.setRequestProperty("X-Reloo-Calendar-Background","1");String cookies=CookieManager.getInstance().getCookie("https://reloo.vn");if(cookies!=null)c.setRequestProperty("Cookie",cookies);
  try(OutputStream out=c.getOutputStream()){out.write(body.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8));}if(c.getResponseCode()!=200)throw new IOException("CALENDAR_FAILED");
  ByteArrayOutputStream bytes=new ByteArrayOutputStream();try(InputStream in=c.getInputStream()){byte[] b=new byte[4096];int n;while((n=in.read(b))>0){if(bytes.size()+n>500000)throw new IOException();bytes.write(b,0,n);}}return new JSONObject(bytes.toString("UTF-8"));
 }
 @Override public boolean onStartJob(JobParameters p){stopped=false;new Thread(()->{try{
  String actor=RelooCalendarEngine.prefs(this).getString("account","");if(actor.isEmpty()||!RelooCalendarEngine.prefs(this).getBoolean("enabled",false))return;String device=RelooCalendarEngine.device(this);
  if(!RelooCalendarEngine.granted(this)){post(new JSONObject().put("subject",actor).put("action","devicePermission").put("device",device).put("granted",false));return;}
  JSONArray jobs=post(new JSONObject().put("subject",actor).put("action","claim").put("device",device)).optJSONArray("jobs");if(jobs==null)return;
  for(int i=0;i<jobs.length()&&!stopped;i++){JSONObject job=jobs.getJSONObject(i);String remote=job.optString("remoteId",""),result="SYNCED";try{remote=RelooCalendarEngine.sync(this,actor,job);}catch(Exception e){result="REAUTH".equals(e.getMessage())?"REAUTH":"CALENDAR_REVIEW".equals(e.getMessage())?"REVIEW":"FAILED";}if(stopped)break;post(new JSONObject().put("subject",actor).put("action","ack").put("id",job.getString("id")).put("lease",job.getString("lease")).put("revision",job.getInt("revision")).put("remote",remote).put("result",result));}
 }catch(Exception ignored){/* No fabricated successful receipt. */}finally{jobFinished(p,false);}},"reloo-calendar-sync").start();return true;}
 @Override public boolean onStopJob(JobParameters p){stopped=true;return true;}
}
