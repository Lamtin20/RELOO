package vn.reloo.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override public void onCreate(android.os.Bundle state){registerPlugin(RelooDevicePlugin.class);registerPlugin(RelooGooglePlugin.class);registerPlugin(RelooCalendarPlugin.class);super.onCreate(state);android.webkit.WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);}
}
