package vn.reloo.app;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.media.MediaMetadataRetriever;
import android.net.Uri;
import android.os.Build;
import android.provider.OpenableColumns;
import android.provider.MediaStore;
import android.view.View;
import android.webkit.CookieManager;
import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.*;
import java.net.*;
import java.security.MessageDigest;
import java.util.UUID;
import java.util.concurrent.Executors;

@CapacitorPlugin(name="RelooDevice")
public class RelooDevicePlugin extends Plugin {
  private final java.util.concurrent.ExecutorService workers=Executors.newFixedThreadPool(2);
  private int integerMeta(String value){try{return value==null?0:Integer.parseInt(value);}catch(Exception e){return 0;}}
  private double durationMeta(String value){try{return value==null?0:Double.parseDouble(value)/1000;}catch(Exception e){return 0;}}
  @Override protected void handleOnDestroy(){workers.shutdownNow();super.handleOnDestroy();}
  @PluginMethod public void chooseVideo(PluginCall call){
    Intent pick=new Intent(Intent.ACTION_OPEN_DOCUMENT);pick.setType("video/*");pick.addCategory(Intent.CATEGORY_OPENABLE);pick.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
    startActivityForResult(call,pick,"videoSelected");
  }
  @PluginMethod public void capturePhoto(PluginCall call){try{
    File folder=new File(getContext().getCacheDir(),"reloo-identity");folder.mkdirs();File[] previous=folder.listFiles();if(previous!=null)for(File f:previous)if(f.lastModified()<System.currentTimeMillis()-3600000L)f.delete();
    File file=new File(folder,UUID.randomUUID()+".jpg");file.createNewFile();call.getData().put("_photoPath",file.getAbsolutePath());Uri output=FileProvider.getUriForFile(getContext(),getContext().getPackageName()+".fileprovider",file);
    Intent camera=new Intent(MediaStore.ACTION_IMAGE_CAPTURE);camera.putExtra(MediaStore.EXTRA_OUTPUT,output);camera.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_WRITE_URI_PERMISSION);camera.setClipData(android.content.ClipData.newUri(getContext().getContentResolver(),"Reloo camera",output));if(call.getBoolean("front",false)){camera.putExtra("android.intent.extra.USE_FRONT_CAMERA",true);camera.putExtra("android.intent.extras.CAMERA_FACING",1);}startActivityForResult(call,camera,"photoCaptured");
  }catch(Exception e){call.reject("Chưa mở được camera thiết bị.");}}
  @ActivityCallback private void photoCaptured(PluginCall call,ActivityResult result){if(call==null)return;String path=call.getString("_photoPath");if(path==null)return;File photo=new File(path);if(result.getResultCode()!=android.app.Activity.RESULT_OK||photo.length()==0){photo.delete();call.reject("Đã hủy chụp ảnh.");return;}JSObject value=new JSObject();value.put("path",path);call.resolve(value);}
  @PluginMethod public void deleteCameraPhoto(PluginCall call){try{File file=new File(call.getString("path","")),root=new File(getContext().getCacheDir(),"reloo-identity");if(!file.getParentFile().getCanonicalPath().equals(root.getCanonicalPath())||!file.getName().matches("[a-f0-9-]{36}\\.jpg")){call.reject("Ảnh camera không hợp lệ.");return;}file.delete();call.resolve();}catch(Exception e){call.reject("Chưa xóa được bộ nhớ camera.");}}
  @ActivityCallback private void videoSelected(PluginCall call,ActivityResult result){
    if(call==null)return;
    if(result.getResultCode()!=android.app.Activity.RESULT_OK||result.getData()==null){JSObject value=new JSObject();value.put("cancelled",true);call.resolve(value);return;}
    Uri uri=result.getData().getData();
    workers.execute(()->{try{
      File root=new File(getContext().getCacheDir(),"reloo-video");root.mkdirs();File[] old=root.listFiles();if(old!=null)for(File f:old)if(f.lastModified()<System.currentTimeMillis()-86400000L)f.delete();
      String name="video.mp4",mime=getContext().getContentResolver().getType(uri);long size=0;
      try(Cursor cursor=getContext().getContentResolver().query(uri,null,null,null,null)){if(cursor!=null&&cursor.moveToFirst()){int ni=cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME),si=cursor.getColumnIndex(OpenableColumns.SIZE);if(ni>=0)name=cursor.getString(ni);if(si>=0)size=cursor.getLong(si);}}
      if(size>80L*1024*1024)throw new IOException("Video tối đa 80 MB.");
      File copy=new File(root,UUID.randomUUID()+".mp4");long total=0;try(InputStream in=getContext().getContentResolver().openInputStream(uri);OutputStream out=new FileOutputStream(copy)){byte[] b=new byte[32768];int n;while((n=in.read(b))!=-1){total+=n;if(total>80L*1024*1024){copy.delete();throw new IOException("Video tối đa 80 MB.");}out.write(b,0,n);}}
      int width=0,height=0,rotation=0;double duration=0;MediaMetadataRetriever meta=new MediaMetadataRetriever();try{meta.setDataSource(copy.getAbsolutePath());width=integerMeta(meta.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH));height=integerMeta(meta.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT));rotation=integerMeta(meta.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION));duration=durationMeta(meta.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION));}catch(Exception ignored){}finally{meta.release();}
      JSObject value=new JSObject();value.put("path",copy.getAbsolutePath());value.put("name",name);value.put("type",mime==null?"video/mp4":mime);value.put("size",total);value.put("duration",duration);value.put("width",rotation%180==90?height:width);value.put("height",rotation%180==90?width:height);call.resolve(value);
    }catch(Exception e){call.reject("Chưa đọc được video đã chọn. Hãy chọn lại clip từ thiết bị.");}});
  }
  @PluginMethod public void immersive(PluginCall call){boolean enabled=call.getBoolean("enabled",false);getActivity().runOnUiThread(()->{
    android.view.Window window=getActivity().getWindow();
    int appearance=enabled?View.SYSTEM_UI_FLAG_FULLSCREEN|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY:View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
    if(!enabled&&Build.VERSION.SDK_INT>=26)appearance|=View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
    window.setStatusBarColor(enabled?android.graphics.Color.BLACK:android.graphics.Color.WHITE);
    window.setNavigationBarColor(enabled||Build.VERSION.SDK_INT<26?android.graphics.Color.BLACK:android.graphics.Color.WHITE);
    window.getDecorView().setBackgroundColor(enabled?android.graphics.Color.BLACK:android.graphics.Color.WHITE);
    window.getDecorView().setSystemUiVisibility(appearance);call.resolve();
  });}
  @PluginMethod public void appInfo(PluginCall call){try{PackageInfo p=getContext().getPackageManager().getPackageInfo(getContext().getPackageName(),0);JSObject data=new JSObject();data.put("version",p.versionName);data.put("versionCode",Build.VERSION.SDK_INT>=28?p.getLongVersionCode():p.versionCode);call.resolve(data);}catch(Exception e){call.reject("Không đọc được phiên bản app.");}}
  @PluginMethod public void installUpdate(PluginCall call){
    String url=call.getString("url"),expected=call.getString("sha256");
    if(url==null||!url.equals("https://reloo.vn/api/mobile/releases/apk")||expected==null||!expected.matches("[a-f0-9]{64}")){call.reject("Gói cập nhật không hợp lệ.");return;}
    workers.execute(()->{try{
      HttpURLConnection http=(HttpURLConnection)new URL(url).openConnection();http.setInstanceFollowRedirects(false);http.setConnectTimeout(20000);http.setReadTimeout(60000);if(http.getResponseCode()!=200)throw new IOException();
      File root=new File(getContext().getCacheDir(),"reloo-update");root.mkdirs();File apk=new File(root,"reloo-update.apk");MessageDigest digest=MessageDigest.getInstance("SHA-256");long total=0;
      try(InputStream in=http.getInputStream();OutputStream out=new FileOutputStream(apk)){byte[] b=new byte[32768];int n;while((n=in.read(b))!=-1){total+=n;if(total>150L*1024*1024)throw new IOException();digest.update(b,0,n);out.write(b,0,n);}}
      StringBuilder hash=new StringBuilder();for(byte b:digest.digest())hash.append(String.format("%02x",b));if(!hash.toString().equals(expected)){apk.delete();throw new IOException();}
      PackageManager pm=getContext().getPackageManager();int flags=Build.VERSION.SDK_INT>=28?PackageManager.GET_SIGNING_CERTIFICATES:PackageManager.GET_SIGNATURES;PackageInfo candidate=pm.getPackageArchiveInfo(apk.getAbsolutePath(),flags),current=pm.getPackageInfo(getContext().getPackageName(),flags);
      if(candidate==null||!candidate.packageName.equals(current.packageName)||(Build.VERSION.SDK_INT>=28?candidate.getLongVersionCode():candidate.versionCode)<=(Build.VERSION.SDK_INT>=28?current.getLongVersionCode():current.versionCode))throw new IOException();
      android.content.pm.Signature[] a=Build.VERSION.SDK_INT>=28?candidate.signingInfo.getApkContentsSigners():candidate.signatures,b=Build.VERSION.SDK_INT>=28?current.signingInfo.getApkContentsSigners():current.signatures;if(a==null||b==null||a.length!=b.length)throw new IOException();for(int i=0;i<a.length;i++)if(!a[i].equals(b[i]))throw new IOException();
      Intent intent=new Intent(Intent.ACTION_VIEW);intent.setDataAndType(FileProvider.getUriForFile(getContext(),getContext().getPackageName()+".fileprovider",apk),"application/vnd.android.package-archive");intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);getActivity().runOnUiThread(()->{getActivity().startActivity(intent);call.resolve();});
    }catch(Exception e){call.reject("Chưa cài được bản cập nhật đã xác minh. Hãy kiểm tra quyền cài đặt ứng dụng và kết nối mạng.");}});
  }
}
