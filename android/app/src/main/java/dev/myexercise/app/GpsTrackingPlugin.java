package dev.myexercise.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
  name = "GpsTracking",
  permissions = {
    @Permission(
      strings = {
        Manifest.permission.ACCESS_FINE_LOCATION,
        Manifest.permission.ACCESS_COARSE_LOCATION,
      },
      alias = "location"
    ),
    @Permission(
      strings = { Manifest.permission.POST_NOTIFICATIONS },
      alias = "notifications"
    ),
  }
)
public class GpsTrackingPlugin extends Plugin {

  private static GpsTrackingPlugin instance;

  @Override
  public void load() {
    instance = this;
  }

  public static GpsTrackingPlugin getInstance() {
    return instance;
  }

  public void emitLocationUpdate(double latitude, double longitude, long timestampMs, float accuracyMeters) {
    JSObject payload = new JSObject();
    payload.put("latitude", latitude);
    payload.put("longitude", longitude);
    payload.put("timestamp", timestampMs);
    payload.put("accuracy", accuracyMeters);
    notifyListeners("locationUpdate", payload);
  }

  public void emitError(String message) {
    JSObject payload = new JSObject();
    payload.put("message", message);
    notifyListeners("error", payload);
  }

  @PluginMethod
  public void startTracking(PluginCall call) {
    if (!hasTrackingPermissions()) {
      requestAllPermissions(call, "permissionsCallback");
      return;
    }
    launchTracking(call);
  }

  @PermissionCallback
  private void permissionsCallback(PluginCall call) {
    if (!hasTrackingPermissions()) {
      call.reject("Location and notification permissions are required for GPS tracking.");
      return;
    }
    launchTracking(call);
  }

  private void launchTracking(PluginCall call) {
    String title = call.getString("title", "Tracking activity");
    String body = call.getString(
      "body",
      "MyExercise is recording your route while the screen is off."
    );

    Intent intent = new Intent(getContext(), GpsTrackingService.class);
    intent.setAction(GpsTrackingService.ACTION_START);
    intent.putExtra(GpsTrackingService.EXTRA_TITLE, title);
    intent.putExtra(GpsTrackingService.EXTRA_BODY, body);
    ContextCompat.startForegroundService(getContext(), intent);
    call.resolve();
  }

  @PluginMethod
  public void stopTracking(PluginCall call) {
    Intent intent = new Intent(getContext(), GpsTrackingService.class);
    intent.setAction(GpsTrackingService.ACTION_STOP);
    getContext().startService(intent);
    call.resolve();
  }

  @PluginMethod
  public void openLocationSettings(PluginCall call) {
    try {
      Intent intent = new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS);
      intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
      getContext().startActivity(intent);
      call.resolve();
    } catch (Exception e) {
      call.reject("Failed to open location settings", null, e);
    }
  }

  private boolean hasTrackingPermissions() {
    if (!hasLocationPermission()) {
      return false;
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      return (
        ContextCompat.checkSelfPermission(
          getContext(),
          Manifest.permission.POST_NOTIFICATIONS
        ) ==
        PackageManager.PERMISSION_GRANTED
      );
    }
    return true;
  }

  private boolean hasLocationPermission() {
    return (
      ContextCompat.checkSelfPermission(
        getContext(),
        Manifest.permission.ACCESS_FINE_LOCATION
      ) ==
      PackageManager.PERMISSION_GRANTED ||
      ContextCompat.checkSelfPermission(
        getContext(),
        Manifest.permission.ACCESS_COARSE_LOCATION
      ) ==
      PackageManager.PERMISSION_GRANTED
    );
  }
}
