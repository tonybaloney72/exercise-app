package dev.myexercise.app

import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.TotalCaloriesBurnedRecord
import androidx.health.connect.client.time.TimeRangeFilter
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.time.Instant
import java.time.format.DateTimeParseException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

/**
 * Single-range Health Connect totals (AggregateRequest).
 * Matches the HC app UI — unlike grouped day buckets from queryAggregated.
 */
@CapacitorPlugin(name = "HealthConnectAggregate")
class HealthConnectAggregatePlugin : Plugin() {
  private val pluginScope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

  override fun handleOnDestroy() {
    super.handleOnDestroy()
    pluginScope.cancel()
  }

  @PluginMethod
  fun queryRangeTotal(call: PluginCall) {
    val dataType = call.getString("dataType")
    if (dataType.isNullOrBlank()) {
      call.reject("dataType is required")
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

    pluginScope.launch {
      val client = getClientOrReject(call) ?: return@launch
      try {
        val value = queryRangeTotal(client, dataType, startInstant, endInstant)
        call.resolve(JSObject().put("value", value))
      } catch (e: Exception) {
        call.reject(e.message ?: "Failed to aggregate Health Connect data", null, e)
      }
    }
  }

  private suspend fun queryRangeTotal(
    client: HealthConnectClient,
    dataType: String,
    startInstant: Instant,
    endInstant: Instant,
  ): Double {
    val filter = TimeRangeFilter.between(startInstant, endInstant)
    return when (dataType) {
      "steps" -> {
        val result =
          client.aggregate(
            AggregateRequest(
              metrics = setOf(StepsRecord.COUNT_TOTAL),
              timeRangeFilter = filter,
            ),
          )
        result[StepsRecord.COUNT_TOTAL]?.toDouble() ?: 0.0
      }
      "calories" -> {
        val result =
          client.aggregate(
            AggregateRequest(
              metrics = setOf(ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL),
              timeRangeFilter = filter,
            ),
          )
        result[ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL]?.inKilocalories ?: 0.0
      }
      "totalCalories" -> {
        val result =
          client.aggregate(
            AggregateRequest(
              metrics = setOf(TotalCaloriesBurnedRecord.ENERGY_TOTAL),
              timeRangeFilter = filter,
            ),
          )
        result[TotalCaloriesBurnedRecord.ENERGY_TOTAL]?.inKilocalories ?: 0.0
      }
      else -> throw IllegalArgumentException("Unsupported dataType: $dataType")
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
}
