package dev.myexercise.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.os.Build;
import android.os.IBinder;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;

public class GpsTrackingService extends Service {

  public static final String ACTION_START = "dev.myexercise.app.GpsTrackingService.START";
  public static final String ACTION_STOP = "dev.myexercise.app.GpsTrackingService.STOP";
  public static final String EXTRA_TITLE = "title";
  public static final String EXTRA_BODY = "body";

  private static final String CHANNEL_ID = "gps_tracking";
  private static final int NOTIFICATION_ID = 41001;

  private FusedLocationProviderClient fusedClient;
  private LocationCallback locationCallback;
  private boolean tracking = false;

  @Override
  public void onCreate() {
    super.onCreate();
    fusedClient = LocationServices.getFusedLocationProviderClient(this);
    createNotificationChannel();
  }

  @Override
  public int onStartCommand(Intent intent, int flags, int startId) {
    if (intent == null) {
      return START_NOT_STICKY;
    }

    String action = intent.getAction();
    if (ACTION_STOP.equals(action)) {
      stopTracking();
      return START_NOT_STICKY;
    }

    if (ACTION_START.equals(action)) {
      String title = intent.getStringExtra(EXTRA_TITLE);
      String body = intent.getStringExtra(EXTRA_BODY);
      startTracking(title, body);
    }

    return START_STICKY;
  }

  private void startTracking(@Nullable String title, @Nullable String body) {
    if (tracking) {
      return;
    }

    Notification notification = buildNotification(
      title != null ? title : "Tracking activity",
      body != null ? body : "MyExercise is recording your route."
    );

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(
        NOTIFICATION_ID,
        notification,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
      );
    } else {
      startForeground(NOTIFICATION_ID, notification);
    }

    LocationRequest request = new LocationRequest.Builder(
      Priority.PRIORITY_HIGH_ACCURACY,
      3_000L
    )
      .setMinUpdateIntervalMillis(2_000L)
      .setMinUpdateDistanceMeters(2f)
      .setWaitForAccurateLocation(false)
      .build();

    locationCallback =
      new LocationCallback() {
        @Override
        public void onLocationResult(LocationResult locationResult) {
          if (locationResult == null) {
            return;
          }
          for (Location location : locationResult.getLocations()) {
            publishLocation(location);
          }
        }
      };

    try {
      fusedClient.requestLocationUpdates(request, locationCallback, null);
      tracking = true;
    } catch (SecurityException ex) {
      GpsTrackingPlugin plugin = GpsTrackingPlugin.getInstance();
      if (plugin != null) {
        plugin.emitError("Location permission was revoked during tracking.");
      }
      stopTracking();
    }
  }

  private void publishLocation(Location location) {
    GpsTrackingPlugin plugin = GpsTrackingPlugin.getInstance();
    if (plugin == null) {
      return;
    }
    plugin.emitLocationUpdate(
      location.getLatitude(),
      location.getLongitude(),
      location.getTime(),
      location.getAccuracy()
    );
  }

  private void stopTracking() {
    if (locationCallback != null) {
      fusedClient.removeLocationUpdates(locationCallback);
      locationCallback = null;
    }
    tracking = false;
    stopForeground(STOP_FOREGROUND_REMOVE);
    stopSelf();
  }

  private Notification buildNotification(String title, String body) {
    Intent launchIntent = new Intent(this, MainActivity.class);
    launchIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
    PendingIntent pendingIntent = PendingIntent.getActivity(
      this,
      0,
      launchIntent,
      PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
    );

    return new NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle(title)
      .setContentText(body)
      .setSmallIcon(android.R.drawable.ic_menu_mylocation)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setContentIntent(pendingIntent)
      .setCategory(NotificationCompat.CATEGORY_SERVICE)
      .build();
  }

  private void createNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return;
    }
    NotificationChannel channel = new NotificationChannel(
      CHANNEL_ID,
      "Activity tracking",
      NotificationManager.IMPORTANCE_LOW
    );
    channel.setDescription("Shown while MyExercise records GPS for a walk or run.");
    NotificationManager manager = getSystemService(NotificationManager.class);
    if (manager != null) {
      manager.createNotificationChannel(channel);
    }
  }

  @Nullable
  @Override
  public IBinder onBind(Intent intent) {
    return null;
  }

  @Override
  public void onDestroy() {
    stopTracking();
    super.onDestroy();
  }
}
