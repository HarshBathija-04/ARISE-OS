package com.arise.os.alarm

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import org.json.JSONObject

/**
 * Computes upcoming alarm instances from the stored plan and registers them
 * with AlarmManager (setExactAndAllowWhileIdle — fires under Doze).
 *
 * Blocks are dateless daily templates keyed by dayType (ALL / OFFICE / WFH /
 * WEEKEND). We schedule concrete instances for TODAY and TOMORROW; the
 * 6-hourly RescheduleWorker and BootReceiver keep the horizon fresh.
 *
 * Per block instance we register:
 *   - a pre-reminder notification `preReminderMinutes` before start
 *   - the exact full-screen alarm at start time
 */
object AlarmScheduler {
    const val CHANNEL_ALARMS = "arise_alarms"
    const val CHANNEL_REMINDERS = "arise_reminders"
    const val CHANNEL_GENERAL = "arise_general"

    private const val TYPE_ALARM = 0
    private const val TYPE_PRE = 1

    fun ensureChannels(context: Context) {
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        // Alarm channel: max importance, NO channel sound — AlarmService owns audio.
        nm.createNotificationChannel(
            NotificationChannel(CHANNEL_ALARMS, "Alarms", NotificationManager.IMPORTANCE_HIGH).apply {
                setSound(null, null)
                enableVibration(false) // service drives the vibrator directly
                setBypassDnd(true)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
                description = "Timetable block alarms"
            },
        )
        nm.createNotificationChannel(
            NotificationChannel(CHANNEL_REMINDERS, "Reminders", NotificationManager.IMPORTANCE_DEFAULT).apply {
                description = "Pre-block reminders"
            },
        )
        nm.createNotificationChannel(
            NotificationChannel(CHANNEL_GENERAL, "System", NotificationManager.IMPORTANCE_DEFAULT).apply {
                description = "Quest resets, reminders and system notifications"
            },
        )
    }

    fun canScheduleExact(context: Context): Boolean {
        val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        return if (Build.VERSION.SDK_INT >= 31) am.canScheduleExactAlarms() else true
    }

    /** Day-type heuristic mirroring the app default: weekends vs weekdays. */
    private fun dayTypeFor(cal: Calendar): String {
        val dow = cal.get(Calendar.DAY_OF_WEEK)
        return if (dow == Calendar.SATURDAY || dow == Calendar.SUNDAY) "WEEKEND" else "OFFICE"
    }

    private fun dateKey(cal: Calendar): String =
        SimpleDateFormat("yyyy-MM-dd", Locale.US).apply { timeZone = cal.timeZone }.format(cal.time)

    private fun requestCode(blockId: String, type: Int, dayOffset: Int): Int =
        (blockId.hashCode() * 31 + type) * 7 + dayOffset

    private fun pendingIntent(
        context: Context,
        block: JSONObject,
        date: String,
        type: Int,
        dayOffset: Int,
        attempt: Int = 1,
    ): PendingIntent {
        val intent = Intent(context, AlarmReceiver::class.java).apply {
            action = if (type == TYPE_ALARM) "com.arise.os.ALARM_FIRE" else "com.arise.os.PRE_REMINDER"
            putExtra("block", block.toString())
            putExtra("date", date)
            putExtra("attempt", attempt)
        }
        return PendingIntent.getBroadcast(
            context,
            requestCode(block.optString("id"), type, dayOffset),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    /** Cancel + re-register everything from the stored plan. Returns count scheduled. */
    fun rescheduleAll(context: Context): Int {
        ensureChannels(context)
        val store = AlarmStore(context)
        val settings = store.settings()
        val blocks = store.blocks()
        val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

        cancelAll(context)
        if (!settings.optBoolean("timetableAlarmsEnabled", true)) return 0
        if (!canScheduleExact(context)) return 0

        val tz = TimeZone.getTimeZone(store.timezone())
        val now = Calendar.getInstance(tz)
        store.pruneOtherDays(dateKey(now))
        val lead = settings.optInt("preReminderMinutes", 5)
        val weekendAlarms = settings.optBoolean("weekendAlarms", true)
        var scheduled = 0

        for (dayOffset in 0..1) {
            val day = (now.clone() as Calendar).apply { add(Calendar.DAY_OF_YEAR, dayOffset) }
            val dayType = dayTypeFor(day)
            if (dayType == "WEEKEND" && !weekendAlarms) continue
            val date = dateKey(day)

            for (i in 0 until blocks.length()) {
                val block = blocks.optJSONObject(i) ?: continue
                val blockDayType = block.optString("dayType", "ALL")
                if (blockDayType != "ALL" && blockDayType != dayType) continue
                if (store.isResolved(block.optString("id"), date)) continue

                val fireAt = (day.clone() as Calendar).apply {
                    set(Calendar.HOUR_OF_DAY, block.optInt("startHour"))
                    set(Calendar.MINUTE, block.optInt("startMin"))
                    set(Calendar.SECOND, 0)
                    set(Calendar.MILLISECOND, 0)
                }
                if (fireAt.timeInMillis <= System.currentTimeMillis()) continue

                am.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    fireAt.timeInMillis,
                    pendingIntent(context, block, date, TYPE_ALARM, dayOffset),
                )
                scheduled++

                val preAt = fireAt.timeInMillis - lead * 60_000L
                if (lead > 0 && preAt > System.currentTimeMillis()) {
                    am.setExactAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        preAt,
                        pendingIntent(context, block, date, TYPE_PRE, dayOffset),
                    )
                }
            }
        }
        return scheduled
    }

    fun cancelAll(context: Context) {
        val store = AlarmStore(context)
        val blocks = store.blocks()
        val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        for (i in 0 until blocks.length()) {
            val block = blocks.optJSONObject(i) ?: continue
            for (type in intArrayOf(TYPE_ALARM, TYPE_PRE)) {
                for (dayOffset in 0..1) {
                    am.cancel(pendingIntent(context, block, "", type, dayOffset))
                }
            }
        }
    }

    /** Re-fire an alarm after `minutes` (snooze) or `gapSec` (missed-attempt repeat). */
    fun scheduleRepeat(context: Context, block: JSONObject, date: String, attempt: Int, delayMs: Long) {
        scheduleDelayed(context, block, date, attempt, delayMs, "com.arise.os.ALARM_FIRE", TYPE_ALARM)
    }

    /** Re-post a pre-reminder after `delayMs` (pre-reminder snooze). */
    fun schedulePreRepeat(context: Context, block: JSONObject, date: String, delayMs: Long) {
        scheduleDelayed(context, block, date, 1, delayMs, "com.arise.os.PRE_REMINDER", TYPE_PRE)
    }

    private fun scheduleDelayed(
        context: Context,
        block: JSONObject,
        date: String,
        attempt: Int,
        delayMs: Long,
        actionName: String,
        type: Int,
    ) {
        val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        if (!canScheduleExact(context)) return
        // dayOffset 2 namespace so repeats don't collide with the daily instances
        val intent = Intent(context, AlarmReceiver::class.java).apply {
            action = actionName
            putExtra("block", block.toString())
            putExtra("date", date)
            putExtra("attempt", attempt)
        }
        val pi = PendingIntent.getBroadcast(
            context,
            requestCode(block.optString("id"), type, 2),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, System.currentTimeMillis() + delayMs, pi)
    }

    /** Fire a test alarm in `seconds` (manual verification hook). */
    fun scheduleTest(context: Context, blockJson: String, seconds: Int) {
        ensureChannels(context)
        val block = JSONObject(blockJson)
        val date = dateKey(Calendar.getInstance())
        scheduleRepeat(context, block, date, 1, seconds * 1000L)
    }
}
