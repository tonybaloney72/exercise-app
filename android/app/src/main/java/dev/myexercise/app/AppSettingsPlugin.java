package dev.myexercise.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AppSettings")
public class AppSettingsPlugin extends Plugin {

  @PluginMethod
  public void openAppSettings(PluginCall call) {
    try {
      Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
      intent.setData(Uri.fromParts("package", getContext().getPackageName(), null));
      intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
      getContext().startActivity(intent);
      call.resolve();
    } catch (Exception e) {
      call.reject("Failed to open app settings", null, e);
    }
  }

  @PluginMethod
  public void openNotificationSettings(PluginCall call) {
    try {
      Intent intent;
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
        intent.putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
      } else {
        intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        intent.setData(Uri.fromParts("package", getContext().getPackageName(), null));
      }
      intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
      getContext().startActivity(intent);
      call.resolve();
    } catch (Exception e) {
      call.reject("Failed to open notification settings", null, e);
    }
  }
}
