package dev.myexercise.app.health

import java.time.Instant
import org.junit.Assert.assertEquals
import org.junit.Test

class SleepAggregationTest {
  @Test
  fun mergeTimeIntervals_mergesOverlappingRanges() {
    val a = Instant.parse("2026-07-02T06:00:00Z")
    val b = Instant.parse("2026-07-02T07:00:00Z")
    val c = Instant.parse("2026-07-02T06:30:00Z")
    val d = Instant.parse("2026-07-02T08:00:00Z")

    val merged =
      SleepAggregation.mergeTimeIntervals(
        listOf(
          SleepTimeInterval(a, b),
          SleepTimeInterval(c, d),
        ),
      )

    assertEquals(1, merged.size)
    assertEquals(a, merged[0].start)
    assertEquals(d, merged[0].end)
    assertEquals(120.0, merged[0].durationMin, 0.01)
  }

  @Test
  fun mergeTimeIntervals_keepsSeparateNapAndNightSleep() {
    val napStart = Instant.parse("2026-07-02T17:00:00Z")
    val napEnd = Instant.parse("2026-07-02T18:00:00Z")
    val nightStart = Instant.parse("2026-07-02T23:00:00Z")
    val nightEnd = Instant.parse("2026-07-03T07:00:00Z")

    val merged =
      SleepAggregation.mergeTimeIntervals(
        listOf(
          SleepTimeInterval(napStart, napEnd),
          SleepTimeInterval(nightStart, nightEnd),
        ),
      )

    assertEquals(2, merged.size)
    assertEquals(60.0, merged[0].durationMin, 0.01)
    assertEquals(480.0, merged[1].durationMin, 0.01)
  }
}
