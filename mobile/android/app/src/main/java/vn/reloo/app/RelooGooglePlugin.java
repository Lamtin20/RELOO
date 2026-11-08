package vn.reloo.app;

import android.os.CancellationSignal;
import androidx.core.content.ContextCompat;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.ClearCredentialStateRequest;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.GetCredentialException;
import androidx.credentials.exceptions.GetCredentialCancellationException;
import androidx.credentials.exceptions.ClearCredentialException;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name="RelooGoogle")
public class RelooGooglePlugin extends Plugin {
  private CancellationSignal pending;

  @PluginMethod public void signIn(PluginCall call) {
    String clientId=call.getString("clientId",""),nonce=call.getString("nonce","");
    if(!clientId.matches("[\\w-]+\\.apps\\.googleusercontent\\.com")||!nonce.matches("[a-f0-9]{64}")){call.reject("Phiên đăng nhập Google không hợp lệ.","GOOGLE_INPUT_INVALID");return;}
    getActivity().runOnUiThread(()->{
      if(pending!=null){call.reject("Google đang mở bộ chọn tài khoản.","GOOGLE_BUSY");return;}
      pending=new CancellationSignal();
      GetSignInWithGoogleOption option=new GetSignInWithGoogleOption.Builder(clientId).setNonce(nonce).build();
      GetCredentialRequest request=new GetCredentialRequest.Builder().addCredentialOption(option).build();
      CredentialManager.create(getContext()).getCredentialAsync(getActivity(),request,pending,ContextCompat.getMainExecutor(getContext()),new CredentialManagerCallback<GetCredentialResponse,GetCredentialException>(){
        @Override public void onResult(GetCredentialResponse result){pending=null;try{
          if(!(result.getCredential() instanceof CustomCredential))throw new IllegalArgumentException();
          GoogleIdTokenCredential credential=GoogleIdTokenCredential.createFrom(result.getCredential().getData());
          JSObject response=new JSObject();response.put("idToken",credential.getIdToken());call.resolve(response);
        }catch(Exception e){call.reject("Chưa đọc được xác nhận từ Google.","GOOGLE_CREDENTIAL_INVALID");}}
        @Override public void onError(GetCredentialException error){pending=null;if(error instanceof GetCredentialCancellationException)call.reject("Đã hủy đăng nhập Google.","GOOGLE_CANCELLED");else call.reject("Chưa mở được tài khoản Google. Hãy kiểm tra kết nối và Google Play services rồi thử lại.","GOOGLE_NATIVE_FAILED");}
      });
    });
  }
  @PluginMethod public void signOut(PluginCall call) {
    CredentialManager.create(getContext()).clearCredentialStateAsync(new ClearCredentialStateRequest(),null,ContextCompat.getMainExecutor(getContext()),new CredentialManagerCallback<Void,ClearCredentialException>(){
      @Override public void onResult(Void result){call.resolve();}
      @Override public void onError(ClearCredentialException error){call.resolve();}
    });
  }
  @Override protected void handleOnDestroy(){if(pending!=null)pending.cancel();super.handleOnDestroy();}
}
