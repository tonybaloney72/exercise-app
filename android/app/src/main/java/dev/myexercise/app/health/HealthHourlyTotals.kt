package dev.myexercise.app.health

import androidx.health.connect.client.HealthConnectClient
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import kotlin.math.roundToInt

/** Health Connect aggregate totals per local hour (deduped like the HC app). */
object HealthHourlyTotals {
  suspend fun queryHourlyTotals(
    client: HealthConnectClient,
    dataType: String,
    dateKey: String,
    isToday: Boolean,
  ): JSObject {
    val zone = ZoneId.systemDefault()
    val date = LocalDate.parse(dateKey)
    val now = Instant.now()
    val currentHour = now.atZone(zone).hour
    val lastHour = if (isToday) currentHour else 23

    val array = JSArray()
    for (hour in 0..lastHour) {
      val hourStart = date.atTime(hour, 0).atZone(zone).toInstant()
      val hourEnd =
        when {
          isToday && hour == currentHour -> now
          hour < 23 ->
            date
              .atTime(hour + 1, 0)
              .atZone(zone)
              .toInstant()
              .minusMillis(1)
          else -> date.plusDays(1).atStartOfDay(zone).toInstant().minusMillis(1)
        }
      if (!hourEnd.isAfter(hourStart)) {
        continue
      }

      val value =
        HealthConnectRepository.queryRangeTotal(client, dataType, hourStart, hourEnd)
      val row = JSObject()
      row.put("hour", hour)
      row.put("value", value.roundToInt())
      array.put(row)
    }

    return JSObject().apply {
      put("hours", array)
      put("dateKey", dateKey)
      put("dataType", dataType)
    }
  }
}
