package dev.myexercise.app

import android.app.Activity
import androidx.activity.result.ActivityResult
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.metadata.Metadata
import androidx.health.connect.client.units.Energy
import androidx.health.connect.client.units.Length
import app.capgo.plugin.health.WorkoutType
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
  )

  private var pendingSave: PendingSave? = null

  override fun handleOnDestroy() {
    super.handleOnDestroy()
    pluginScope.cancel()
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

    pluginScope.launch {
      val client = getClientOrReject(call) ?: return@launch
      val writePermission =
        HealthPermission.getWritePermission(ExerciseSessionRecord::class)
      val granted = client.permissionController.getGrantedPermissions()
      if (!granted.contains(writePermission)) {
        pendingSave =
          PendingSave(
            call,
            exerciseType,
            startInstant,
            endInstant,
            distanceMeters,
            activeCaloriesKcal,
          )
        val intent = permissionContract.createIntent(context, setOf(writePermission))
        try {
          startActivityForResult(call, intent, "permissionsCallback")
        } catch (e: Exception) {
          pendingSave = null
          call.reject("Failed to launch Health Connect permission request.", null, e)
        }
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
      )
    }
  }

  @ActivityCallback
  private fun permissionsCallback(call: PluginCall?, result: ActivityResult) {
    val pending = pendingSave
    pendingSave = null
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
      val writePermission =
        HealthPermission.getWritePermission(ExerciseSessionRecord::class)
      val granted = client.permissionController.getGrantedPermissions()
      if (!granted.contains(writePermission)) {
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
      )
    }
  }

  private suspend fun insertSession(
    call: PluginCall,
    client: HealthConnectClient,
    exerciseType: Int,
    startInstant: Instant,
    endInstant: Instant,
    distanceMeters: Double?,
    activeCaloriesKcal: Double?,
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
      call.resolve()
    } catch (e: Exception) {
      call.reject(e.message ?: "Failed to save exercise session", null, e)
    }
  }

  private fun zoneOffset(instant: Instant): ZoneOffset =
    ZoneOffset.systemDefault().rules.getOffset(instant)

  private fun getClientOrReject(call: PluginCall): HealthConnectClient? {
    val status = HealthConnectClient.getSdkStatus(context)
    if (status != HealthConnectClient.SDK_AVAILABLE) {
      call.reject("Health Connect is not available")
      return null
    }
    return HealthConnectClient.getOrCreate(context)
  }
}
