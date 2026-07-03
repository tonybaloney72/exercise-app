package dev.myexercise.app;

import android.app.DownloadManager;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.webkit.DownloadListener;
import android.webkit.URLUtil;
import android.webkit.WebView;
import android.widget.Toast;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(GpsTrackingPlugin.class);
    registerPlugin(HealthConnectPlugin.class);
    registerPlugin(HealthExerciseWritePlugin.class);
    registerPlugin(TimerAudioFocusPlugin.class);
    super.onCreate(savedInstanceState);
    if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
      WebView.setWebContentsDebuggingEnabled(true);
    }
  }

  @Override
  public void onStart() {
    super.onStart();
    attachApkDownloadListener();
  }

  private void attachApkDownloadListener() {
    if (getBridge() == null) {
      return;
    }

    WebView webView = getBridge().getWebView();
    if (webView == null) {
      return;
    }

    webView.setDownloadListener(
      new DownloadListener() {
        @Override
        public void onDownloadStart(
          String url,
          String userAgent,
          String contentDisposition,
          String mimeType,
          long contentLength
        ) {
          if (url == null || url.isEmpty()) {
            return;
          }

          try {
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
            String filename = URLUtil.guessFileName(url, contentDisposition, mimeType);
            if (filename == null || filename.isEmpty()) {
              filename = "myexercise.apk";
            }

            String resolvedMime =
              mimeType != null && !mimeType.isEmpty()
                ? mimeType
                : "application/vnd.android.package-archive";

            request.setMimeType(resolvedMime);
            request.setTitle("MyExercise");
            request.setDescription("Downloading app update");
            request.setNotificationVisibility(
              DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED
            );
            request.setDestinationInExternalPublicDir(
              Environment.DIRECTORY_DOWNLOADS,
              filename
            );

            DownloadManager manager = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
            if (manager != null) {
              manager.enqueue(request);
              Toast
                .makeText(
                  MainActivity.this,
                  "Download started — check Notifications",
                  Toast.LENGTH_LONG
                )
                .show();
              return;
            }
          } catch (Exception ignored) {
            // Fall through to VIEW intent.
          }

          Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
          intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
          startActivity(intent);
        }
      }
    );
  }
}
