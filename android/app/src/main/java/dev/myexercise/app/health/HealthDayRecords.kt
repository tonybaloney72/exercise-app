package dev.myexercise.app.health

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.OxygenSaturationRecord
import androidx.health.connect.client.records.RestingHeartRateRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.Vo2MaxRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import kotlin.reflect.KClass

/** Individual Health Connect samples/sessions for one local calendar day. */
object HealthDayRecords {
  private val formatter: DateTimeFormatter = DateTimeFormatter.ISO_INSTANT
  private const val MAX_PAGE_SIZE = 500

  suspend fun queryDayRecords(
    context: Context,
    client: HealthConnectClient,
    recordType: String,
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

    val array =
      when (recordType) {
        "steps" -> readSteps(context, client, dayStart, dayEnd)
        "heartRate" -> readHeartRate(context, client, dayStart, dayEnd)
        "restingHeartRate" -> readRestingHeartRate(context, client, dayStart, dayEnd)
        "oxygenSaturation" -> readOxygenSaturation(context, client, dayStart, dayEnd)
        "sleep" -> readSleepSessions(context, client, dateKey, dayStart, dayEnd, zone)
        "vo2Max" -> readVo2Max(context, client, dayStart, dayEnd)
        else -> throw IllegalArgumentException("Unsupported recordType: $recordType")
      }

    return JSObject().apply {
      put("records", array)
      put("dateKey", dateKey)
      put("recordType", recordType)
    }
  }

  private suspend fun readSteps(
    context: Context,
    client: HealthConnectClient,
    start: Instant,
    end: Instant,
  ): JSArray {
    val records = readAllRecords(client, StepsRecord::class, start, end)
    val array = JSArray()
    for (record in records) {
      val row = JSObject()
      row.put("startTime", formatter.format(record.startTime))
      row.put("endTime", formatter.format(record.endTime))
      row.put("value", record.count.toDouble())
      row.put("unit", "count")
      putSource(context, row, record.metadata)
      array.put(row)
    }
    return array
  }

  private suspend fun readHeartRate(
    context: Context,
    client: HealthConnectClient,
    start: Instant,
    end: Instant,
  ): JSArray {
    val records = readAllRecords(client, HeartRateRecord::class, start, end)
    val array = JSArray()
    for (record in records) {
      for (sample in record.samples) {
        val row = JSObject()
        row.put("startTime", formatter.format(sample.time))
        row.put("value", sample.beatsPerMinute.toDouble())
        row.put("unit", "bpm")
        putSource(context, row, record.metadata)
        array.put(row)
      }
    }
    return array
  }

  private suspend fun readRestingHeartRate(
    context: Context,
    client: HealthConnectClient,
    start: Instant,
    end: Instant,
  ): JSArray {
    val records = readAllRecords(client, RestingHeartRateRecord::class, start, end)
    val array = JSArray()
    for (record in records) {
      val row = JSObject()
      row.put("startTime", formatter.format(record.time))
      row.put("value", record.beatsPerMinute.toDouble())
      row.put("unit", "bpm")
      putSource(context, row, record.metadata)
      array.put(row)
    }
    return array
  }

  private suspend fun readOxygenSaturation(
    context: Context,
    client: HealthConnectClient,
    start: Instant,
    end: Instant,
  ): JSArray {
    val records = readAllRecords(client, OxygenSaturationRecord::class, start, end)
    val array = JSArray()
    for (record in records) {
      val row = JSObject()
      row.put("startTime", formatter.format(record.time))
      row.put("value", record.percentage.value)
      row.put("unit", "percent")
      putSource(context, row, record.metadata)
      array.put(row)
    }
    return array
  }

  private suspend fun readVo2Max(
    context: Context,
    client: HealthConnectClient,
    start: Instant,
    end: Instant,
  ): JSArray {
    val records = readAllRecords(client, Vo2MaxRecord::class, start, end)
    val array = JSArray()
    for (record in records) {
      val row = JSObject()
      row.put("startTime", formatter.format(record.time))
      row.put("value", record.vo2MillilitersPerMinuteKilogram)
      row.put("unit", "ml/kg/min")
      putSource(context, row, record.metadata)
      array.put(row)
    }
    return array
  }

  private suspend fun readSleepSessions(
    context: Context,
    client: HealthConnectClient,
    dateKey: String,
    dayStart: Instant,
    dayEnd: Instant,
    zone: ZoneId,
  ): JSArray {
    val queryStart = dayStart.minus(Duration.ofDays(1))
    val records = readAllRecords(client, SleepSessionRecord::class, queryStart, dayEnd)
    val wakeDate = LocalDate.parse(dateKey)
    val array = JSArray()
    for (session in records) {
      if (session.endTime.atZone(zone).toLocalDate() != wakeDate) continue
      val durationMin =
        Duration.between(session.startTime, session.endTime).toMillis() / 60_000.0
      val row = JSObject()
      row.put("startTime", formatter.format(session.startTime))
      row.put("endTime", formatter.format(session.endTime))
      row.put("value", durationMin)
      row.put("unit", "min")
      putSource(context, row, session.metadata)
      array.put(row)
    }
    return array
  }

  private suspend fun <T : androidx.health.connect.client.records.Record> readAllRecords(
    client: HealthConnectClient,
    recordType: KClass<T>,
    start: Instant,
    end: Instant,
  ): List<T> {
    val results = mutableListOf<T>()
    var pageToken: String? = null
    do {
      val response =
        client.readRecords(
          ReadRecordsRequest(
            recordType = recordType,
            timeRangeFilter = TimeRangeFilter.between(start, end),
            pageSize = MAX_PAGE_SIZE,
            pageToken = pageToken,
          ),
        )
      @Suppress("UNCHECKED_CAST")
      results.addAll(response.records as List<T>)
      pageToken = response.pageToken
    } while (pageToken != null)
    return results
  }

  private fun putSource(
    context: Context,
    row: JSObject,
    metadata: androidx.health.connect.client.records.metadata.Metadata,
  ) {
    val dataOrigin = metadata.dataOrigin
    val packageName = dataOrigin.packageName
    val deviceLabel =
      metadata.device?.let { device ->
        listOfNotNull(
            device.manufacturer?.takeIf { it.isNotBlank() },
            device.model?.takeIf { it.isNotBlank() },
          )
          .joinToString(" ")
          .trim()
          .takeIf { it.isNotEmpty() }
      }
    row.put(
      "sourceName",
      HealthSourceDisplay.resolve(context, packageName, deviceLabel),
    )
  }
}
