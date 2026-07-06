package dev.myexercise.app.health

import androidx.health.connect.client.records.SleepSessionRecord
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

internal data class SleepTimeInterval(
  val start: Instant,
  val end: Instant,
) {
  val durationMin: Double
    get() = Duration.between(start, end).toMillis() / 60_000.0
}

internal data class SleepStageTotals(
  val totalMin: Double,
  val deepMin: Double,
  val remMin: Double,
  val lightMin: Double,
  val awakeMin: Double,
)

internal object SleepAggregation {
  private const val DUPLICATE_OVERLAP_FRACTION = 0.75

  fun totalsForWakeDate(
    records: List<SleepSessionRecord>,
    dateKey: String,
    zone: ZoneId,
  ): SleepStageTotals {
    val date = LocalDate.parse(dateKey)
    val matching =
      records.filter { session ->
        session.endTime.atZone(zone).toLocalDate() == date
      }
    if (matching.isEmpty()) {
      return SleepStageTotals(0.0, 0.0, 0.0, 0.0, 0.0)
    }

    val deduped = deduplicateSleepSessions(matching)
    val asleepIntervals =
      deduped
        .flatMap(::asleepIntervalsForSession)
        .let(::mergeTimeIntervals)

    var deepMin = 0.0
    var remMin = 0.0
    var lightMin = 0.0
    var awakeMin = 0.0

    for (session in deduped) {
      val stages = session.stages
      if (stages.isNullOrEmpty()) continue
      for (stage in stages) {
        val stageMin = clippedStageDurationMin(stage.startTime, stage.endTime, session)
        if (stageMin <= 0) continue
        when (stage.stage) {
          SleepSessionRecord.STAGE_TYPE_DEEP -> deepMin += stageMin
          SleepSessionRecord.STAGE_TYPE_REM -> remMin += stageMin
          SleepSessionRecord.STAGE_TYPE_LIGHT,
          SleepSessionRecord.STAGE_TYPE_SLEEPING,
          -> lightMin += stageMin
          SleepSessionRecord.STAGE_TYPE_AWAKE -> awakeMin += stageMin
          else -> Unit
        }
      }
    }

    val mergedAsleepMin = asleepIntervals.sumOf { it.durationMin }
    val stageAsleepMin = deepMin + remMin + lightMin
    val totalMin =
      when {
        mergedAsleepMin > 0 -> mergedAsleepMin
        stageAsleepMin > 0 -> stageAsleepMin
        else -> deduped.sumOf { sessionDurationMin(it) }
      }

    return SleepStageTotals(
      totalMin = totalMin,
      deepMin = deepMin,
      remMin = remMin,
      lightMin = lightMin,
      awakeMin = awakeMin,
    )
  }

  internal fun deduplicateSleepSessions(
    sessions: List<SleepSessionRecord>,
  ): List<SleepSessionRecord> {
    if (sessions.size <= 1) return sessions
    val sorted =
      sessions.sortedByDescending { session ->
        Duration.between(session.startTime, session.endTime).toMillis()
      }
    val kept = mutableListOf<SleepSessionRecord>()
    for (candidate in sorted) {
      val duplicate =
        kept.any { existing ->
          overlapFraction(candidate, existing) >= DUPLICATE_OVERLAP_FRACTION
        }
      if (!duplicate) kept.add(candidate)
    }
    return kept
  }

  internal fun asleepIntervalsForSession(
    session: SleepSessionRecord,
  ): List<SleepTimeInterval> {
    val stages = session.stages
    if (stages.isNullOrEmpty()) {
      return listOf(SleepTimeInterval(session.startTime, session.endTime))
    }
    return stages
      .filter { stage -> isAsleepStage(stage.stage) }
      .mapNotNull { stage ->
        val start = maxInstant(stage.startTime, session.startTime)
        val end = minInstant(stage.endTime, session.endTime)
        if (end.isAfter(start)) SleepTimeInterval(start, end) else null
      }
  }

  internal fun mergeTimeIntervals(
    intervals: List<SleepTimeInterval>,
  ): List<SleepTimeInterval> {
    if (intervals.isEmpty()) return emptyList()
    val sorted = intervals.sortedBy { it.start }
    val merged = ArrayList<SleepTimeInterval>()
    var current = sorted.first()
    for (index in 1 until sorted.size) {
      val next = sorted[index]
      if (!next.start.isAfter(current.end)) {
        val end = if (next.end.isAfter(current.end)) next.end else current.end
        current = SleepTimeInterval(current.start, end)
      } else {
        merged.add(current)
        current = next
      }
    }
    merged.add(current)
    return merged
  }

  private fun isAsleepStage(stage: Int): Boolean =
    when (stage) {
      SleepSessionRecord.STAGE_TYPE_AWAKE,
      SleepSessionRecord.STAGE_TYPE_OUT_OF_BED,
      -> false
      else -> true
    }

  private fun sessionDurationMin(session: SleepSessionRecord): Double =
    Duration.between(session.startTime, session.endTime).toMillis() / 60_000.0

  private fun clippedStageDurationMin(
    stageStart: Instant,
    stageEnd: Instant,
    session: SleepSessionRecord,
  ): Double {
    val start = maxInstant(stageStart, session.startTime)
    val end = minInstant(stageEnd, session.endTime)
    if (!end.isAfter(start)) return 0.0
    return Duration.between(start, end).toMillis() / 60_000.0
  }

  private fun overlapFraction(
    a: SleepSessionRecord,
    b: SleepSessionRecord,
  ): Double {
    val overlapStart = maxInstant(a.startTime, b.startTime)
    val overlapEnd = minInstant(a.endTime, b.endTime)
    if (!overlapEnd.isAfter(overlapStart)) return 0.0
    val overlapMs = Duration.between(overlapStart, overlapEnd).toMillis().toDouble()
    val aMs = Duration.between(a.startTime, a.endTime).toMillis().toDouble()
    val bMs = Duration.between(b.startTime, b.endTime).toMillis().toDouble()
    val shorter = minOf(aMs, bMs)
    if (shorter <= 0) return 0.0
    return overlapMs / shorter
  }

  private fun maxInstant(a: Instant, b: Instant): Instant = if (a.isAfter(b)) a else b

  private fun minInstant(a: Instant, b: Instant): Instant = if (a.isBefore(b)) a else b
}
