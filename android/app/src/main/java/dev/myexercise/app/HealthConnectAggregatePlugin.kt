package dev.myexercise.app

import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.aggregate.AggregationResult
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
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeParseException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

/**
 * Health Connect daily totals using AggregateRequest over the device local calendar day.
 */
@CapacitorPlugin(name = "HealthConnectAggregate")
class HealthConnectAggregatePlugin : Plugin() {
  private val pluginScope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

  override fun handleOnDestroy() {
    super.handleOnDestroy()
    pluginScope.cancel()
  }

  /** Local calendar day on device (YYYY-MM-DD) — matches the HC app day total. */
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
        val value = queryLocalDayTotal(client, dataType, dateKey, isToday)
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

  private fun localDayInstantWindow(
    dateKey: String,
    isToday: Boolean,
  ): Pair<Instant, Instant> {
    val zone = ZoneId.systemDefault()
    val date = LocalDate.parse(dateKey)
    val start = date.atStartOfDay(zone).toInstant()
    val end =
      if (isToday) {
        Instant.now()
      } else {
        date.plusDays(1).atStartOfDay(zone).toInstant().minusMillis(1)
      }
    return start to end
  }

  private suspend fun queryLocalDayTotal(
    client: HealthConnectClient,
    dataType: String,
    dateKey: String,
    isToday: Boolean,
  ): Double {
    val (start, end) = localDayInstantWindow(dateKey, isToday)
    return queryRangeTotal(client, dataType, start, end)
  }

  private suspend fun queryRangeTotal(
    client: HealthConnectClient,
    dataType: String,
    startInstant: Instant,
    endInstant: Instant,
  ): Double {
    val filter = TimeRangeFilter.between(startInstant, endInstant)
    val metrics = metricsFor(dataType)
    val result =
      client.aggregate(
        AggregateRequest(
          metrics = metrics,
          timeRangeFilter = filter,
        ),
      )
    return extractMetric(dataType, result)
  }

  private fun metricsFor(dataType: String) =
    when (dataType) {
      "steps" -> setOf(StepsRecord.COUNT_TOTAL)
      "calories" -> setOf(ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL)
      "totalCalories" -> setOf(TotalCaloriesBurnedRecord.ENERGY_TOTAL)
      else -> throw IllegalArgumentException("Unsupported dataType: $dataType")
    }

  private fun extractMetric(dataType: String, result: AggregationResult): Double =
    when (dataType) {
      "steps" -> result[StepsRecord.COUNT_TOTAL]?.toDouble() ?: 0.0
      "calories" ->
        result[ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL]?.inKilocalories ?: 0.0
      "totalCalories" -> result[TotalCaloriesBurnedRecord.ENERGY_TOTAL]?.inKilocalories ?: 0.0
      else -> 0.0
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
