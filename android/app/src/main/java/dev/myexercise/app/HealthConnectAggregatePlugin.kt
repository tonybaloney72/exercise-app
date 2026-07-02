package dev.myexercise.app

import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.aggregate.AggregationResult
import androidx.health.connect.client.request.AggregateGroupByPeriodRequest
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
import java.time.LocalDateTime
import java.time.Period
import java.time.ZoneId
import java.time.format.DateTimeParseException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

/**
 * Health Connect daily totals using the device local calendar day — matches the HC app.
 */
@CapacitorPlugin(name = "HealthConnectAggregate")
class HealthConnectAggregatePlugin : Plugin() {
  private val pluginScope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

  override fun handleOnDestroy() {
    super.handleOnDestroy()
    pluginScope.cancel()
  }

  /** Preferred: local calendar day on device (YYYY-MM-DD), not JS ISO instants. */
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

  private fun localDayWindow(
    dateKey: String,
    isToday: Boolean,
  ): Pair<LocalDateTime, LocalDateTime> {
    val zone = ZoneId.systemDefault()
    val date = LocalDate.parse(dateKey)
    val start = date.atStartOfDay()
    val end =
      if (isToday) {
        LocalDateTime.now(zone)
      } else {
        date.plusDays(1).atStartOfDay().minusNanos(1)
      }
    return start to end
  }

  private suspend fun queryLocalDayTotal(
    client: HealthConnectClient,
    dataType: String,
    dateKey: String,
    isToday: Boolean,
  ): Double {
    val (start, end) = localDayWindow(dateKey, isToday)
    val filter = TimeRangeFilter.between(start, end)
    val metrics = metricsFor(dataType)

    val periodResults =
      client.aggregateGroupByPeriod(
        AggregateGroupByPeriodRequest(
          metrics = metrics,
          timeRangeFilter = filter,
          timeRangeSlicer = Period.ofDays(1),
        ),
      )
    var total = 0.0
    for (grouped in periodResults) {
      total += extractMetric(dataType, grouped.result)
    }
    if (total > 0) return total

    val rangeResult =
      client.aggregate(
        AggregateRequest(
          metrics = metrics,
          timeRangeFilter = filter,
        ),
      )
    return extractMetric(dataType, rangeResult)
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
