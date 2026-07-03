package dev.myexercise.app.health

import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.aggregate.AggregationResult
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.TotalCaloriesBurnedRecord
import androidx.health.connect.client.records.WeightRecord
import androidx.health.connect.client.records.metadata.Metadata
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import androidx.health.connect.client.units.Energy
import androidx.health.connect.client.units.Length
import androidx.health.connect.client.units.Mass
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import kotlin.math.min
import kotlinx.coroutines.CancellationException

/** Native Health Connect reads/writes (no Capgo). */
object HealthConnectRepository {
  private val formatter: DateTimeFormatter = DateTimeFormatter.ISO_INSTANT
  private const val DEFAULT_PAGE_SIZE = 100
  private const val MAX_PAGE_SIZE = 500

  fun parseInstant(value: String?, fallback: Instant): Instant {
    if (value.isNullOrBlank()) return fallback
    return Instant.parse(value)
  }

  suspend fun queryRangeTotal(
    client: HealthConnectClient,
    dataType: String,
    startInstant: Instant,
    endInstant: Instant,
  ): Double {
    val filter = TimeRangeFilter.between(startInstant, endInstant)
    val result =
      client.aggregate(
        AggregateRequest(
          metrics = metricsFor(dataType),
          timeRangeFilter = filter,
        ),
      )
    return extractMetric(dataType, result)
  }

  suspend fun queryLocalDayTotal(
    client: HealthConnectClient,
    dataType: String,
    dateKey: String,
    isToday: Boolean,
  ): Double {
    val zone = ZoneId.systemDefault()
    val date = LocalDate.parse(dateKey)
    val start = date.atStartOfDay(zone).toInstant()
    val end =
      if (isToday) {
        Instant.now()
      } else {
        date.plusDays(1).atStartOfDay(zone).toInstant().minusMillis(1)
      }
    return queryRangeTotal(client, dataType, start, end)
  }

  suspend fun queryExerciseSessions(
    client: HealthConnectClient,
    startInstant: Instant,
    endInstant: Instant,
    limit: Int,
    ascending: Boolean,
  ): JSObject {
    val workouts = mutableListOf<Pair<Instant, JSObject>>()
    var pageToken: String? = null
    val pageSize = if (limit > 0) min(limit, MAX_PAGE_SIZE) else DEFAULT_PAGE_SIZE
    var fetched = 0

    do {
      val response =
        client.readRecords(
          ReadRecordsRequest(
            recordType = ExerciseSessionRecord::class,
            timeRangeFilter = TimeRangeFilter.between(startInstant, endInstant),
            pageSize = pageSize,
            pageToken = pageToken,
          ),
        )

      for (record in response.records) {
        val session = record as ExerciseSessionRecord
        val aggregated = aggregateWorkoutData(client, session)
        workouts.add(session.startTime to createWorkoutPayload(session, aggregated))
      }

      fetched += response.records.size
      pageToken = response.pageToken
    } while (pageToken != null && (limit <= 0 || fetched < limit))

    val ordered =
      (if (ascending) workouts.sortedBy { it.first } else workouts.sortedByDescending { it.first })
        .let { if (limit > 0) it.take(limit) else it }

    val array = JSArray()
    ordered.forEach { array.put(it.second) }
    return JSObject().put("workouts", array)
  }

  suspend fun writeHealthSample(
    client: HealthConnectClient,
    dataType: String,
    value: Double,
    startInstant: Instant,
    endInstant: Instant,
  ) {
    val metadata = Metadata.manualEntry()
    val startOffset = zoneOffset(startInstant)
    val endOffset = zoneOffset(endInstant)

    when (dataType) {
      "distance" ->
        client.insertRecords(
          listOf(
            DistanceRecord(
              startTime = startInstant,
              startZoneOffset = startOffset,
              endTime = endInstant,
              endZoneOffset = endOffset,
              distance = Length.meters(value),
              metadata = metadata,
            ),
          ),
        )
      "calories" ->
        client.insertRecords(
          listOf(
            ActiveCaloriesBurnedRecord(
              startTime = startInstant,
              startZoneOffset = startOffset,
              endTime = endInstant,
              endZoneOffset = endOffset,
              energy = Energy.kilocalories(value),
              metadata = metadata,
            ),
          ),
        )
      "weight" ->
        client.insertRecords(
          listOf(
            WeightRecord(
              time = startInstant,
              zoneOffset = startOffset,
              weight = Mass.kilograms(value),
              metadata = metadata,
            ),
          ),
        )
      else -> throw IllegalArgumentException("Unsupported write dataType: $dataType")
    }
  }

  private fun metricsFor(dataType: String) =
    when (dataType) {
      "steps" -> setOf(StepsRecord.COUNT_TOTAL)
      "calories" -> setOf(ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL)
      "totalCalories" -> setOf(TotalCaloriesBurnedRecord.ENERGY_TOTAL)
      "distance" -> setOf(DistanceRecord.DISTANCE_TOTAL)
      "heartRate" -> setOf(HeartRateRecord.BPM_AVG)
      else -> throw IllegalArgumentException("Unsupported dataType: $dataType")
    }

  private fun extractMetric(dataType: String, result: AggregationResult): Double =
    when (dataType) {
      "steps" -> result[StepsRecord.COUNT_TOTAL]?.toDouble() ?: 0.0
      "calories" ->
        result[ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL]?.inKilocalories ?: 0.0
      "totalCalories" -> result[TotalCaloriesBurnedRecord.ENERGY_TOTAL]?.inKilocalories ?: 0.0
      "distance" -> result[DistanceRecord.DISTANCE_TOTAL]?.inMeters ?: 0.0
      "heartRate" -> result[HeartRateRecord.BPM_AVG]?.toDouble() ?: 0.0
      else -> 0.0
    }

  private suspend fun aggregateWorkoutData(
    client: HealthConnectClient,
    session: ExerciseSessionRecord,
  ): WorkoutAggregatedData {
    val timeRange = TimeRangeFilter.between(session.startTime, session.endTime)
    var distanceAggregate: Double? = null
    var caloriesAggregate: Double? = null

    try {
      val result =
        client.aggregate(
          AggregateRequest(
            metrics =
              setOf(
                DistanceRecord.DISTANCE_TOTAL,
                ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL,
              ),
            timeRangeFilter = timeRange,
          ),
        )
      distanceAggregate = result[DistanceRecord.DISTANCE_TOTAL]?.inMeters
      caloriesAggregate =
        result[ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL]?.inKilocalories
    } catch (e: CancellationException) {
      throw e
    } catch (_: Exception) {
      // Permission or empty aggregate — session still returned without totals.
    }

    if (caloriesAggregate == null) {
      try {
        val fallback =
          client.aggregate(
            AggregateRequest(
              metrics = setOf(TotalCaloriesBurnedRecord.ENERGY_TOTAL),
              timeRangeFilter = timeRange,
            ),
          )
        caloriesAggregate = fallback[TotalCaloriesBurnedRecord.ENERGY_TOTAL]?.inKilocalories
      } catch (e: CancellationException) {
        throw e
      } catch (_: Exception) {
      }
    }

    return WorkoutAggregatedData(distanceAggregate, caloriesAggregate)
  }

  private data class WorkoutAggregatedData(
    val totalDistance: Double?,
    val totalEnergyBurned: Double?,
  )

  private fun createWorkoutPayload(
    session: ExerciseSessionRecord,
    aggregatedData: WorkoutAggregatedData,
  ): JSObject {
    val payload = JSObject()
    payload.put("workoutType", WorkoutType.toWorkoutTypeString(session.exerciseType))
    payload.put(
      "duration",
      Duration.between(session.startTime, session.endTime).seconds.toInt(),
    )
    payload.put("startDate", formatter.format(session.startTime))
    payload.put("endDate", formatter.format(session.endTime))
    aggregatedData.totalDistance?.let { payload.put("totalDistance", it) }
    aggregatedData.totalEnergyBurned?.let { payload.put("totalEnergyBurned", it) }

    val dataOrigin = session.metadata.dataOrigin
    payload.put("sourceId", dataOrigin.packageName)
    payload.put("sourceName", dataOrigin.packageName)
    session.metadata.device?.let { device ->
      val label =
        listOfNotNull(
            device.manufacturer?.takeIf { it.isNotBlank() },
            device.model?.takeIf { it.isNotBlank() },
          )
          .joinToString(" ")
          .trim()
      if (label.isNotEmpty()) payload.put("sourceName", label)
    }
    payload.put("platformId", session.metadata.id)
    return payload
  }

  private fun zoneOffset(instant: Instant): ZoneOffset =
    ZoneId.systemDefault().rules.getOffset(instant)
}
