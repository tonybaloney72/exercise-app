package dev.myexercise.app.health

import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.aggregate.AggregationResult
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.ExerciseRoute
import androidx.health.connect.client.records.ExerciseRouteResult
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.OxygenSaturationRecord
import androidx.health.connect.client.records.RestingHeartRateRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.TotalCaloriesBurnedRecord
import androidx.health.connect.client.records.Vo2MaxRecord
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
    return when (dataType) {
      "restingHeartRate" -> queryRestingHeartRateAvg(client, start, end) ?: 0.0
      "oxygenSaturation" -> queryOxygenSaturationAvg(client, start, end) ?: 0.0
      else -> queryRangeTotal(client, dataType, start, end)
    }
  }

  suspend fun querySleepDayTotals(
    client: HealthConnectClient,
    dateKey: String,
    isToday: Boolean,
  ): JSObject {
    val zone = ZoneId.systemDefault()
    val date = LocalDate.parse(dateKey)
    val dayStart = date.atStartOfDay(zone).toInstant()
    val dayEnd =
      if (isToday) {
        Instant.now()
      } else {
        date.plusDays(1).atStartOfDay(zone).toInstant().minusMillis(1)
      }

    // Sessions that end on this local day (wake-date attribution).
    val queryStart = dayStart.minus(Duration.ofDays(1))
    val response =
      client.readRecords(
        ReadRecordsRequest(
          recordType = SleepSessionRecord::class,
          timeRangeFilter = TimeRangeFilter.between(queryStart, dayEnd),
          pageSize = MAX_PAGE_SIZE,
        ),
      )

    var totalMin = 0.0
    var deepMin = 0.0
    var remMin = 0.0
    var lightMin = 0.0
    var awakeMin = 0.0

    for (record in response.records) {
      val session = record as SleepSessionRecord
      val wakeInstant = session.endTime
      val wakeDate = wakeInstant.atZone(zone).toLocalDate()
      if (wakeDate != date) continue

      val stages = session.stages
      if (stages.isNullOrEmpty()) {
        val sessionMin =
          Duration.between(session.startTime, session.endTime).toMillis() / 60_000.0
        if (sessionMin > 0) totalMin += sessionMin
        continue
      }

      for (stage in stages) {
        val stageMin = Duration.between(stage.startTime, stage.endTime).toMillis() / 60_000.0
        if (stageMin <= 0) continue
        totalMin += stageMin
        when (stage.stage) {
          SleepSessionRecord.STAGE_TYPE_DEEP -> deepMin += stageMin
          SleepSessionRecord.STAGE_TYPE_REM -> remMin += stageMin
          SleepSessionRecord.STAGE_TYPE_LIGHT -> lightMin += stageMin
          SleepSessionRecord.STAGE_TYPE_AWAKE -> awakeMin += stageMin
          else -> Unit
        }
      }
    }

    return JSObject().apply {
      put("sleepTotalMin", totalMin)
      put("sleepDeepMin", deepMin)
      put("sleepRemMin", remMin)
      put("sleepLightMin", lightMin)
      put("sleepAwakeMin", awakeMin)
      put("dateKey", dateKey)
    }
  }

  suspend fun queryLatestVo2Max(client: HealthConnectClient): JSObject {
    val end = Instant.now()
    val start = end.minus(Duration.ofDays(365))
    val response =
      client.readRecords(
        ReadRecordsRequest(
          recordType = Vo2MaxRecord::class,
          timeRangeFilter = TimeRangeFilter.between(start, end),
          pageSize = MAX_PAGE_SIZE,
        ),
      )
    val latest =
      response.records
        .map { it as Vo2MaxRecord }
        .maxByOrNull { it.time }
    return JSObject().apply {
      if (latest != null) {
        put("value", latest.vo2MillilitersPerMinuteKilogram)
        put("time", formatter.format(latest.time))
      }
    }
  }

  suspend fun queryVo2MaxHistory(
    client: HealthConnectClient,
    startInstant: Instant,
    endInstant: Instant,
  ): JSObject {
    val response =
      client.readRecords(
        ReadRecordsRequest(
          recordType = Vo2MaxRecord::class,
          timeRangeFilter = TimeRangeFilter.between(startInstant, endInstant),
          pageSize = MAX_PAGE_SIZE,
        ),
      )
    val readings =
      response.records
        .map { it as Vo2MaxRecord }
        .sortedBy { it.time }
    val array = JSArray()
    for (reading in readings) {
      val row = JSObject()
      row.put("value", reading.vo2MillilitersPerMinuteKilogram)
      row.put("time", formatter.format(reading.time))
      array.put(row)
    }
    return JSObject().put("readings", array)
  }

  suspend fun readExerciseRouteStatus(
    client: HealthConnectClient,
    platformId: String,
  ): JSObject {
    val response = client.readRecord(ExerciseSessionRecord::class, platformId)
    return exerciseRouteResultToJs(response.record.exerciseRouteResult)
  }

  fun exerciseRouteToJs(route: ExerciseRoute): JSObject {
    val points = JSArray()
    for (location in route.route) {
      val point = JSObject()
      point.put("lat", location.latitude)
      point.put("lng", location.longitude)
      point.put("timestamp", location.time.toEpochMilli())
      points.put(point)
    }
    return JSObject().apply {
      put("status", "data")
      put("points", points)
    }
  }

  private fun exerciseRouteResultToJs(result: ExerciseRouteResult): JSObject {
    return when (result) {
      is ExerciseRouteResult.Data -> exerciseRouteToJs(result.exerciseRoute)
      is ExerciseRouteResult.ConsentRequired ->
        JSObject().apply {
          put("status", "consentRequired")
          put("points", JSArray())
        }
      is ExerciseRouteResult.NoData ->
        JSObject().apply {
          put("status", "noData")
          put("points", JSArray())
        }
      else ->
        JSObject().apply {
          put("status", "noData")
          put("points", JSArray())
        }
    }
  }

  private suspend fun queryRestingHeartRateAvg(
    client: HealthConnectClient,
    startInstant: Instant,
    endInstant: Instant,
  ): Double? {
    val response =
      client.readRecords(
        ReadRecordsRequest(
          recordType = RestingHeartRateRecord::class,
          timeRangeFilter = TimeRangeFilter.between(startInstant, endInstant),
          pageSize = MAX_PAGE_SIZE,
        ),
      )
    val values = response.records.map { (it as RestingHeartRateRecord).beatsPerMinute.toDouble() }
    if (values.isEmpty()) return null
    return values.average()
  }

  private suspend fun queryOxygenSaturationAvg(
    client: HealthConnectClient,
    startInstant: Instant,
    endInstant: Instant,
  ): Double? {
    val response =
      client.readRecords(
        ReadRecordsRequest(
          recordType = OxygenSaturationRecord::class,
          timeRangeFilter = TimeRangeFilter.between(startInstant, endInstant),
          pageSize = MAX_PAGE_SIZE,
        ),
      )
    val values =
      response.records.map { (it as OxygenSaturationRecord).percentage.value }
    if (values.isEmpty()) return null
    return values.average()
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
