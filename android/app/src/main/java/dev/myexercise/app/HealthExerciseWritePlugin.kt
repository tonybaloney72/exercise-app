package dev.myexercise.app

import android.app.Activity
import androidx.activity.result.ActivityResult
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.SpeedRecord
import androidx.health.connect.client.records.metadata.Metadata
import androidx.health.connect.client.units.Energy
import androidx.health.connect.client.units.Length
import androidx.health.connect.client.units.Velocity
import app.capgo.plugin.health.WorkoutType
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import java.time.Instant
import java.time.ZoneOffset
import java.time.format.DateTimeParseException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

@CapacitorPlugin(name = "HealthExerciseWrite")
class HealthExerciseWritePlugin : Plugin() {
  private val pluginScope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
  private val permissionContract = PermissionController.createRequestPermissionResultContract()

  private data class PendingSave(
    val call: PluginCall,
    val exerciseType: Int,
    val startInstant: Instant,
    val endInstant: Instant,
    val distanceMeters: Double?,
    val activeCaloriesKcal: Double?,
    val speedMetersPerSecond: Double?,
  )

  private var pendingSave: PendingSave? = null
  private var pendingPermissionCheck: PluginCall? = null

  override fun handleOnDestroy() {
    super.handleOnDestroy()
    pluginScope.cancel()
  }

  @PluginMethod
  fun ensureWritePermission(call: PluginCall) {
    pluginScope.launch {
      val client = getClientOrReject(call) ?: return@launch
      if (hasExerciseWritePermission(client)) {
        call.resolve(JSObject().put("granted", true))
        return@launch
      }
      pendingPermissionCheck = call
      launchPermissionRequest(call)
    }
  }

  @PluginMethod
  fun saveExerciseSession(call: PluginCall) {
    val workoutType = call.getString("workoutType")
    if (workoutType.isNullOrBlank()) {
      call.reject("workoutType is required")
      return
    }

    val exerciseType = WorkoutType.fromString(workoutType)
    if (exerciseType == null) {
      call.reject("Unsupported workoutType: $workoutType")
      return
    }

    val startInstant = try {
      Instant.parse(call.getString("startDate"))
    } catch (e: DateTimeParseException) {
      call.reject("Invalid startDate", null, e)
      return
    }

    val endInstant = try {
      Instant.parse(call.getString("endDate"))
    } catch (e: DateTimeParseException) {
      call.reject("Invalid endDate", null, e)
      return
    }

    if (endInstant.isBefore(startInstant)) {
      call.reject("endDate must be greater than or equal to startDate")
      return
    }

    val distanceMeters = call.getDouble("distanceMeters")
    val activeCaloriesKcal = call.getDouble("activeCaloriesKcal")
    val speedMetersPerSecond = call.getDouble("speedMetersPerSecond")

    pluginScope.launch {
      val client = getClientOrReject(call) ?: return@launch
      if (!hasExerciseWritePermission(client)) {
        pendingSave =
          PendingSave(
            call,
            exerciseType,
            startInstant,
            endInstant,
            distanceMeters,
            activeCaloriesKcal,
            speedMetersPerSecond,
          )
        launchPermissionRequest(call, speedMetersPerSecond != null && speedMetersPerSecond > 0)
        return@launch
      }
      if (
        speedMetersPerSecond != null &&
          speedMetersPerSecond > 0 &&
          !hasSpeedWritePermission(client)
      ) {
        pendingSave =
          PendingSave(
            call,
            exerciseType,
            startInstant,
            endInstant,
            distanceMeters,
            activeCaloriesKcal,
            speedMetersPerSecond,
          )
        launchPermissionRequest(call, includeSpeed = true)
        return@launch
      }
      insertSession(
        call,
        client,
        exerciseType,
        startInstant,
        endInstant,
        distanceMeters,
        activeCaloriesKcal,
        speedMetersPerSecond,
      )
    }
  }

  @ActivityCallback
  private fun permissionsCallback(call: PluginCall?, result: ActivityResult) {
    val permissionCheck = pendingPermissionCheck
    pendingPermissionCheck = null
    val pending = pendingSave
    pendingSave = null

    if (permissionCheck != null) {
      pluginScope.launch {
        val granted =
          result.resultCode == Activity.RESULT_OK && permissionGrantedAfterResult()
        permissionCheck.resolve(JSObject().put("granted", granted))
      }
      return
    }

    if (pending == null) {
      call?.reject("Permission request cancelled")
      return
    }
    if (result.resultCode != Activity.RESULT_OK) {
      pending.call.reject("Exercise session write permission not granted")
      return
    }

    pluginScope.launch {
      val client = getClientOrReject(pending.call) ?: return@launch
      if (!hasExerciseWritePermission(client)) {
        pending.call.reject("Exercise session write permission not granted")
        return@launch
      }
      insertSession(
        pending.call,
        client,
        pending.exerciseType,
        pending.startInstant,
        pending.endInstant,
        pending.distanceMeters,
        pending.activeCaloriesKcal,
        pending.speedMetersPerSecond,
      )
    }
  }

  private fun writePermissions(includeSpeed: Boolean): Set<String> {
    val permissions =
      mutableSetOf(HealthPermission.getWritePermission(ExerciseSessionRecord::class))
    if (includeSpeed) {
      permissions.add(HealthPermission.getWritePermission(SpeedRecord::class))
    }
    return permissions
  }

  private fun launchPermissionRequest(call: PluginCall, includeSpeed: Boolean = false) {
    val intent = permissionContract.createIntent(context, writePermissions(includeSpeed))
    try {
      startActivityForResult(call, intent, "permissionsCallback")
    } catch (e: Exception) {
      pendingSave = null
      pendingPermissionCheck = null
      call.reject("Failed to launch Health Connect permission request.", null, e)
    }
  }

  private suspend fun permissionGrantedAfterResult(): Boolean {
    val client = getClientOrReject(null) ?: return false
    return hasExerciseWritePermission(client)
  }

  private suspend fun hasExerciseWritePermission(
    client: HealthConnectClient,
  ): Boolean {
    val writePermission =
      HealthPermission.getWritePermission(ExerciseSessionRecord::class)
    return client.permissionController.getGrantedPermissions().contains(writePermission)
  }

  private suspend fun hasSpeedWritePermission(
    client: HealthConnectClient,
  ): Boolean {
    val writePermission = HealthPermission.getWritePermission(SpeedRecord::class)
    return client.permissionController.getGrantedPermissions().contains(writePermission)
  }

  private suspend fun insertSession(
    call: PluginCall,
    client: HealthConnectClient,
    exerciseType: Int,
    startInstant: Instant,
    endInstant: Instant,
    distanceMeters: Double?,
    activeCaloriesKcal: Double?,
    speedMetersPerSecond: Double?,
  ) {
    try {
      val metadata = Metadata.manualEntry()
      val startOffset = zoneOffset(startInstant)
      val endOffset = zoneOffset(endInstant)
      val records = mutableListOf<androidx.health.connect.client.records.Record>()

      records.add(
        ExerciseSessionRecord(
          startTime = startInstant,
          startZoneOffset = startOffset,
          endTime = endInstant,
          endZoneOffset = endOffset,
          exerciseType = exerciseType,
          metadata = metadata,
        ),
      )

      if (distanceMeters != null && distanceMeters > 0) {
        records.add(
          DistanceRecord(
            startTime = startInstant,
            startZoneOffset = startOffset,
            endTime = endInstant,
            endZoneOffset = endOffset,
            distance = Length.meters(distanceMeters),
            metadata = metadata,
          ),
        )
      }

      if (activeCaloriesKcal != null && activeCaloriesKcal > 0) {
        records.add(
          ActiveCaloriesBurnedRecord(
            startTime = startInstant,
            startZoneOffset = startOffset,
            endTime = endInstant,
            endZoneOffset = endOffset,
            energy = Energy.kilocalories(activeCaloriesKcal),
            metadata = metadata,
          ),
        )
      }

      client.insertRecords(records)

      if (speedMetersPerSecond != null && speedMetersPerSecond > 0) {
        val speedPermission =
          HealthPermission.getWritePermission(SpeedRecord::class)
        if (client.permissionController.getGrantedPermissions().contains(speedPermission)) {
          val sampleTime =
            startInstant.plusSeconds(
              java.time.Duration.between(startInstant, endInstant).seconds / 2,
            )
          client.insertRecords(
            listOf(
              SpeedRecord(
                startTime = startInstant,
                startZoneOffset = startOffset,
                endTime = endInstant,
                endZoneOffset = endOffset,
                samples =
                  listOf(
                    SpeedRecord.Sample(
                      time = sampleTime,
                      speed = Velocity.metersPerSecond(speedMetersPerSecond),
                    ),
                  ),
                metadata = metadata,
              ),
            ),
          )
        }
      }

      call.resolve()
    } catch (e: Exception) {
      call.reject(e.message ?: "Failed to save exercise session", null, e)
    }
  }

  private fun zoneOffset(instant: Instant): ZoneOffset =
    ZoneOffset.systemDefault().rules.getOffset(instant)

  private fun getClientOrReject(call: PluginCall?): HealthConnectClient? {
    val status = HealthConnectClient.getSdkStatus(context)
    if (status != HealthConnectClient.SDK_AVAILABLE) {
      call?.reject("Health Connect is not available")
      return null
    }
    return HealthConnectClient.getOrCreate(context)
  }
}
