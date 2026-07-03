package dev.myexercise.app

import android.app.Activity
import android.os.Bundle
import android.webkit.WebView
import android.webkit.WebViewClient

/** Privacy policy screen for Health Connect permission rationale (Android 13 and earlier). */
class HealthConnectRationaleActivity : Activity() {
  private val defaultUrl = "file:///android_asset/public/privacypolicy.html"

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val webView = WebView(applicationContext)
    webView.webViewClient = WebViewClient()
    webView.settings.javaScriptEnabled = false
    setContentView(webView)
    webView.loadUrl(getPrivacyPolicyUrl())
  }

  private fun getPrivacyPolicyUrl(): String {
    return try {
      val resId =
        resources.getIdentifier("health_connect_privacy_policy_url", "string", packageName)
      if (resId != 0) getString(resId) else defaultUrl
    } catch (_: Exception) {
      defaultUrl
    }
  }
}
