package dev.myexercise.app

import android.app.Activity
import android.content.Intent
import androidx.activity.result.ActivityResult
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import dev.myexercise.app.health.HealthConnectRepository
import dev.myexercise.app.health.HealthConnectScopes
import java.time.Duration
import java.time.Instant
import java.time.format.DateTimeParseException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

@CapacitorPlugin(name = "HealthConnect")
class HealthConnectPlugin : Plugin() {
  private val pluginScope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
  private val permissionContract = PermissionController.createRequestPermissionResultContract()
  private var pendingReadScopes: List<String> = emptyList()
  private var pendingWriteScopes: List<String> = emptyList()

  override fun handleOnDestroy() {
    super.handleOnDestroy()
    pluginScope.cancel()
  }

  @PluginMethod
  fun isAvailable(call: PluginCall) {
    val status = HealthConnectClient.getSdkStatus(context)
    call.resolve(
      JSObject().apply {
        put("platform", "android")
        put("available", status == HealthConnectClient.SDK_AVAILABLE)
        if (status != HealthConnectClient.SDK_AVAILABLE) {
          put("reason", availabilityReason(status))
        }
      },
    )
  }

  @PluginMethod
  fun getPluginVersion(call: PluginCall) {
    call.resolve(JSObject().put("version", "native/1.0"))
  }

  @PluginMethod
  fun checkAuthorization(call: PluginCall) {
    val readScopes = parseScopeList(call, "read")
    val writeScopes = parseScopeList(call, "write")
    pluginScope.launch {
      val client = getClientOrReject(call) ?: return@launch
      val status = HealthConnectScopes.authorizationStatus(client, readScopes, writeScopes)
      call.resolve(status)
    }
  }

  @PluginMethod
  fun requestAuthorization(call: PluginCall) {
    val readScopes = parseScopeList(call, "read")
    val writeScopes = parseScopeList(call, "write")
    pluginScope.launch {
      val client = getClientOrReject(call) ?: return@launch
      val permissions = HealthConnectScopes.allPermissions(readScopes, writeScopes)
      if (permissions.isEmpty()) {
        call.resolve(HealthConnectScopes.authorizationStatus(client, readScopes, writeScopes))
        return@launch
      }
      val granted = client.permissionController.getGrantedPermissions()
      if (granted.containsAll(permissions)) {
        call.resolve(HealthConnectScopes.authorizationStatus(client, readScopes, writeScopes))
        return@launch
      }
      pendingReadScopes = readScopes
      pendingWriteScopes = writeScopes
      val intent = permissionContract.createIntent(context, permissions)
      try {
        startActivityForResult(call, intent, "handlePermissionResult")
      } catch (e: Exception) {
        pendingReadScopes = emptyList()
        pendingWriteScopes = emptyList()
        call.reject("Failed to launch Health Connect permission request.", null, e)
      }
    }
  }

  @ActivityCallback
  private fun handlePermissionResult(call: PluginCall?, result: ActivityResult) {
    if (call == null) return
    val readScopes = pendingReadScopes
    val writeScopes = pendingWriteScopes
    pendingReadScopes = emptyList()
    pendingWriteScopes = emptyList()
    pluginScope.launch {
      val client = getClientOrReject(call) ?: return@launch
      call.resolve(HealthConnectScopes.authorizationStatus(client, readScopes, writeScopes))
    }
  }

  @PluginMethod
  fun openHealthConnectSettings(call: PluginCall) {
    try {
      val intent = Intent(HealthConnectClient.ACTION_HEALTH_CONNECT_SETTINGS)
      intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
      context.startActivity(intent)
      call.resolve()
    } catch (e: Exception) {
      call.reject("Failed to open Health Connect settings", null, e)
    }
  }

  @PluginMethod
  fun queryExerciseSessions(call: PluginCall) {
    val limit = (call.getInt("limit") ?: 30).coerceAtLeast(0)
    val ascending = call.getBoolean("ascending") ?: false
    val startInstant = parseInstantArg(call, "startDate") ?: return
    val endInstant = parseInstantArg(call, "endDate") ?: return
    if (endInstant.isBefore(startInstant)) {
      call.reject("endDate must be greater than or equal to startDate")
      return
    }
    pluginScope.launch {
      val client = getClientOrReject(call) ?: return@launch
      try {
        val result =
          HealthConnectRepository.queryExerciseSessions(
            client,
            startInstant,
            endInstant,
            limit,
            ascending,
          )
        call.resolve(result)
      } catch (e: Exception) {
        call.reject(e.message ?: "Failed to query exercise sessions", null, e)
      }
    }
  }

  @PluginMethod
  fun queryRangeTotal(call: PluginCall) {
    val dataType = call.getString("dataType")
    if (dataType.isNullOrBlank()) {
      call.reject("dataType is required")
      return
    }
    val startInstant = parseInstantArg(call, "startDate") ?: return
    val endInstant = parseInstantArg(call, "endDate") ?: return
    if (endInstant.isBefore(startInstant)) {
      call.reject("endDate must be greater than or equal to startDate")
      return
    }
    pluginScope.launch {
      val client = getClientOrReject(call) ?: return@launch
      try {
        val value =
          HealthConnectRepository.queryRangeTotal(client, dataType, startInstant, endInstant)
        call.resolve(JSObject().put("value", value))
      } catch (e: Exception) {
        call.reject(e.message ?: "Failed to aggregate Health Connect data", null, e)
      }
    }
  }

  @PluginMethod
  fun queryLocalDayTotal(call: PluginCall) {
    val dateKey = call.getString("dateKey")
    if (dateKey.isNullOrBlank()) {
      call.reject("dateKey is required")
      return
    }
    val dataType = call.getString("dataType")
    if (dataType.isNullOrBlank()) {
      call.reject("dataType is required")
      return
    }
    val isToday = call.getBoolean("isToday", false) ?: false
    pluginScope.launch {
      val client = getClientOrReject(call) ?: return@launch
      try {
        val value =
          HealthConnectRepository.queryLocalDayTotal(client, dataType, dateKey, isToday)
        call.resolve(
          JSObject().apply {
            put("value", value)
            put("dateKey", dateKey)
            put("isToday", isToday)
          },
        )
      } catch (e: Exception) {
        call.reject(e.message ?: "Failed to read local day total", null, e)
      }
    }
  }

  @PluginMethod
  fun writeHealthSample(call: PluginCall) {
    val dataType = call.getString("dataType")
    if (dataType.isNullOrBlank()) {
      call.reject("dataType is required")
      return
    }
    val value = call.getDouble("value")
    if (value == null || !value.isFinite()) {
      call.reject("value is required")
      return
    }
    val startInstant = parseInstantArg(call, "startDate") ?: return
    val endInstant = parseInstantArg(call, "endDate") ?: return
    pluginScope.launch {
      val client = getClientOrReject(call) ?: return@launch
      try {
        HealthConnectRepository.writeHealthSample(client, dataType, value, startInstant, endInstant)
        call.resolve()
      } catch (e: Exception) {
        call.reject(e.message ?: "Failed to write Health Connect sample", null, e)
      }
    }
  }

  private fun parseScopeList(call: PluginCall, key: String): List<String> {
    val array = call.getArray(key) ?: return emptyList()
    val scopes = mutableListOf<String>()
    for (i in 0 until array.length()) {
      val scope = array.optString(i)
      if (!scope.isNullOrBlank()) scopes.add(scope)
    }
    return scopes
  }

  private fun parseInstantArg(call: PluginCall, key: String): Instant? {
    return try {
      HealthConnectRepository.parseInstant(
        call.getString(key),
        if (key == "startDate") Instant.now().minus(Duration.ofDays(1)) else Instant.now(),
      )
    } catch (e: DateTimeParseException) {
      call.reject("Invalid $key", null, e)
      null
    }
  }

  private fun getClientOrReject(call: PluginCall): HealthConnectClient? {
    val status = HealthConnectClient.getSdkStatus(context)
    if (status != HealthConnectClient.SDK_AVAILABLE) {
      call.reject("Health Connect is not available")
      return null
    }
    return HealthConnectClient.getOrCreate(context)
  }

  private fun availabilityReason(status: Int): String =
    when (status) {
      HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED ->
        "Health Connect needs an update."
      HealthConnectClient.SDK_UNAVAILABLE -> "Health Connect is unavailable on this device."
      else -> "Health Connect availability unknown."
    }
}
