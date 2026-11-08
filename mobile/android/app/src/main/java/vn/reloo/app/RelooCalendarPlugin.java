package vn.reloo.app;
import android.Manifest;
import android.app.job.*;
import android.content.ComponentName;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import org.json.JSONObject;
@CapacitorPlugin(name="RelooCalendar",permissions={@Permission(alias="calendar",strings={Manifest.permission.READ_CALENDAR,Manifest.permission.WRITE_CALENDAR})})
public class RelooCalendarPlugin extends Plugin {
 @PluginMethod public void identity(PluginCall call){JSObject r=new JSObject();r.put("device",RelooCalendarEngine.device(getContext()));r.put("granted",RelooCalendarEngine.granted(getContext()));call.resolve(r);}
 @PluginMethod public void requestPermission(PluginCall call){if(RelooCalendarEngine.granted(getContext()))permissionResult(call);else requestPermissionForAlias("calendar",call,"permissionResult");}
 @PermissionCallback private void permissionResult(PluginCall call){JSObject r=new JSObject();r.put("granted",RelooCalendarEngine.granted(getContext()));call.resolve(r);}
 @PluginMethod public void calendars(PluginCall call){try{JSObject r=new JSObject();r.put("device",RelooCalendarEngine.device(getContext()));r.put("calendars",new JSArray(RelooCalendarEngine.calendars(getContext()).toString()));call.resolve(r);}catch(Exception e){call.reject(e.getMessage());}}
 @PluginMethod public void ensureCalendar(PluginCall call){try{call.resolve(JSObject.fromJSONObject(RelooCalendarEngine.ensureCalendar(getContext(),call.getString("account"))));}catch(Exception e){call.reject(e.getMessage()==null?"CALENDAR_FAILED":e.getMessage());}}
 @PluginMethod public void bind(PluginCall call){String account=call.getString("account","");boolean enabled=call.getBoolean("enabled",false)&&!account.isEmpty();RelooCalendarEngine.bind(getContext(),account,enabled);JobScheduler scheduler=(JobScheduler)getContext().getSystemService(android.content.Context.JOB_SCHEDULER_SERVICE);scheduler.cancel(7031);if(enabled)scheduler.schedule(new JobInfo.Builder(7031,new ComponentName(getContext(),RelooCalendarJob.class)).setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY).setPeriodic(15*60*1000L).build());call.resolve();}
 @PluginMethod public void sync(PluginCall call){try{JSONObject job=call.getObject("job");String id=RelooCalendarEngine.sync(getContext(),call.getString("account"),job);JSObject r=new JSObject();r.put("remoteId",id);call.resolve(r);}catch(Exception e){call.reject(e.getMessage()==null?"CALENDAR_FAILED":e.getMessage());}}
}
