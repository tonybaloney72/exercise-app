package dev.myexercise.app.health

import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.RestingHeartRateRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.TotalCaloriesBurnedRecord
import androidx.health.connect.client.records.WeightRecord
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject

/** Maps JS scope strings to Health Connect read permissions. */
object HealthConnectScopes {
  private val readScopeToPermission: Map<String, String> =
    mapOf(
      "steps" to HealthPermission.getReadPermission(StepsRecord::class),
      "distance" to HealthPermission.getReadPermission(DistanceRecord::class),
      "calories" to HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class),
      "totalCalories" to HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class),
      "heartRate" to HealthPermission.getReadPermission(HeartRateRecord::class),
      "restingHeartRate" to HealthPermission.getReadPermission(RestingHeartRateRecord::class),
      "workouts" to HealthPermission.getReadPermission(ExerciseSessionRecord::class),
    )

  private val writeScopeToPermission: Map<String, String> =
    mapOf(
      "distance" to HealthPermission.getWritePermission(DistanceRecord::class),
      "calories" to HealthPermission.getWritePermission(ActiveCaloriesBurnedRecord::class),
      "weight" to HealthPermission.getWritePermission(WeightRecord::class),
      "workouts" to HealthPermission.getWritePermission(ExerciseSessionRecord::class),
    )

  fun readPermissions(readScopes: Collection<String>): Set<String> {
    val permissions = readScopes.mapNotNull { readScopeToPermission[it] }.toMutableSet()
    if (permissions.isNotEmpty()) {
      permissions.add(HealthPermission.PERMISSION_READ_HEALTH_DATA_HISTORY)
    }
    return permissions
  }

  fun writePermissions(writeScopes: Collection<String>): Set<String> =
    writeScopes.mapNotNull { writeScopeToPermission[it] }.toSet()

  fun allPermissions(readScopes: Collection<String>, writeScopes: Collection<String>): Set<String> =
  readPermissions(readScopes) + writePermissions(writeScopes)

  suspend fun authorizationStatus(
    client: HealthConnectClient,
    readScopes: Collection<String>,
    writeScopes: Collection<String>,
  ): JSObject {
    val granted = client.permissionController.getGrantedPermissions()

    val readAuthorized = JSArray()
    val readDenied = JSArray()
    for (scope in readScopes) {
      val permission = readScopeToPermission[scope] ?: continue
      if (granted.contains(permission)) readAuthorized.put(scope) else readDenied.put(scope)
    }

    val writeAuthorized = JSArray()
    val writeDenied = JSArray()
    for (scope in writeScopes) {
      val permission = writeScopeToPermission[scope] ?: continue
      if (granted.contains(permission)) writeAuthorized.put(scope) else writeDenied.put(scope)
    }

    return JSObject().apply {
      put("readAuthorized", readAuthorized)
      put("readDenied", readDenied)
      put("writeAuthorized", writeAuthorized)
      put("writeDenied", writeDenied)
    }
  }
}
