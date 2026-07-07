package dev.myexercise.app.health

import android.content.Context

/** Friendly labels for Health Connect writer package names. */
object HealthSourceDisplay {
  private val packageLabels =
    mapOf(
      "com.nothing.smartcenter" to "Nothing Watch",
      "com.google.android.apps.fitness" to "Google Fit",
      "com.google.android.apps.wearables" to "Pixel Watch",
      "com.sec.android.app.shealth" to "Samsung Health",
      "com.samsung.android.apps.watchhealth" to "Samsung Health",
      "com.garmin.android.apps.connectmobile" to "Garmin Connect",
      "com.fitbit.FitbitMobile" to "Fitbit",
      "com.mi.health" to "Mi Fitness",
      "com.huawei.health" to "Huawei Health",
      "com.oneplus.healthconnect" to "OnePlus Health",
      "com.ouraring.oura" to "Oura",
      "com.withings.wiscale2" to "Withings",
      "com.polar.polarflow" to "Polar Flow",
      "com.strava" to "Strava",
      "com.heytap.health" to "Oppo Health",
      "com.realme.link" to "realme Link",
    )

  private val packageNameRegex = Regex("^[a-z][a-z0-9_]*(\\.[a-z][a-z0-9_]*)+$", RegexOption.IGNORE_CASE)

  fun looksLikePackageName(value: String): Boolean = packageNameRegex.matches(value.trim())

  fun resolve(
    context: Context,
    packageName: String,
    deviceLabel: String?,
  ): String {
    val trimmedDevice = deviceLabel?.trim().orEmpty()
    if (trimmedDevice.isNotEmpty() && !looksLikePackageName(trimmedDevice)) {
      return trimmedDevice
    }

    packageLabels[packageName]?.let { return it }

    appLabel(context, packageName)?.let { return it }

    return guessFromPackage(packageName)
  }

  private fun appLabel(context: Context, packageName: String): String? {
    return try {
      val pm = context.packageManager
      val appInfo = pm.getApplicationInfo(packageName, 0)
      pm.getApplicationLabel(appInfo).toString().trim().takeIf { it.isNotEmpty() }
    } catch (_: Exception) {
      null
    }
  }

  private fun guessFromPackage(packageName: String): String {
    val skip = setOf("com", "android", "app", "apps", "mobile", "health")
    val parts = packageName.split(".").filter { it.isNotBlank() }
    val meaningful = parts.filter { !skip.contains(it.lowercase()) }
    val brand = meaningful.firstOrNull() ?: parts.lastOrNull() ?: packageName
    return brand
      .split('_', '-')
      .filter { it.isNotBlank() }
      .joinToString(" ") { word ->
        word.lowercase().replaceFirstChar { ch -> ch.titlecase() }
      }
  }
}
