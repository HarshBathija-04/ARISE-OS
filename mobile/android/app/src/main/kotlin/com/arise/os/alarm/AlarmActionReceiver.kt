package com.arise.os.alarm

import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import org.json.JSONObject

/**
 * Handles action buttons on the alarm and pre-reminder notifications.
 * Skip from a notification records "Other" (the reason picker needs the
 * full-screen activity); Snooze uses the configured default.
 */
class AlarmActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val block = runCatching { JSONObject(intent.getStringExtra("block") ?: "{}") }
            .getOrDefault(JSONObject())
        val date = intent.getStringExtra("date") ?: return
        val blockId = block.optString("id")
        val responseMs =
            if (AlarmService.firedAtMs > 0) System.currentTimeMillis() - AlarmService.firedAtMs else 0L

        when (intent.action) {
            "com.arise.os.action.CONFIRM" -> {
                AlarmActions.confirm(context, block, date, responseMs)
                openApp(context, "/alarm-result?blockId=$blockId&date=$date&action=confirm")
            }
            "com.arise.os.action.SKIP" -> {
                // Full-screen activity has the reason picker; notification skip
                // opens it instead of guessing a reason.
                context.startActivity(Intent(context, AlarmActivity::class.java).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    putExtra("block", block.toString())
                    putExtra("date", date)
                })
            }
            "com.arise.os.action.SNOOZE" -> {
                val config = AlarmStore(context).settings().optJSONObject("alarmConfig")
                val minutes = config?.optInt("defaultSnooze", 5) ?: 5
                AlarmActions.snooze(context, block, date, minutes, responseMs)
            }
            // Pre-reminder buttons
            "com.arise.os.action.PRE_OPEN" -> {
                cancelPre(context, blockId)
                openApp(context, "/timetable")
            }
            "com.arise.os.action.PRE_SKIP" -> {
                cancelPre(context, blockId)
                // Skipping from the pre-reminder resolves the upcoming alarm too.
                AlarmStore(context).markResolved(blockId, date)
                EventQueue(context).enqueue(blockId, date, "SKIPPED", skipReason = "Pre-reminder skip")
            }
            "com.arise.os.action.PRE_SNOOZE" -> {
                cancelPre(context, blockId)
                // Re-post the pre-reminder in 5 minutes.
                AlarmScheduler.schedulePreRepeat(context, block, date, 5 * 60_000L)
            }
        }
    }

    private fun cancelPre(context: Context, blockId: String) {
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.cancel(("pre:$blockId").hashCode())
    }

    private fun openApp(context: Context, route: String) {
        context.packageManager.getLaunchIntentForPackage(context.packageName)?.let {
            it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            it.putExtra("route", route)
            context.startActivity(it)
        }
    }
}
