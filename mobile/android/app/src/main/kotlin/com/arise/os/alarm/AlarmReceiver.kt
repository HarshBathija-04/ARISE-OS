package com.arise.os.alarm

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import org.json.JSONObject

/**
 * Receives exact-alarm broadcasts:
 *   ALARM_FIRE   → start the foreground AlarmService (full-screen alarm)
 *   PRE_REMINDER → post a normal reminder notification with Open/Skip/Snooze
 */
class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val blockJson = intent.getStringExtra("block") ?: return
        val date = intent.getStringExtra("date") ?: return
        val attempt = intent.getIntExtra("attempt", 1)
        val store = AlarmStore(context)
        val block = runCatching { JSONObject(blockJson) }.getOrNull() ?: return
        val blockId = block.optString("id")

        if (store.isResolved(blockId, date)) return // confirmed/skipped meanwhile

        when (intent.action) {
            "com.arise.os.ALARM_FIRE" -> {
                val service = Intent(context, AlarmService::class.java).apply {
                    putExtra("block", blockJson)
                    putExtra("date", date)
                    putExtra("attempt", attempt)
                }
                context.startForegroundService(service)
            }
            "com.arise.os.PRE_REMINDER" -> postPreReminder(context, block, date)
        }
    }

    private fun postPreReminder(context: Context, block: JSONObject, date: String) {
        AlarmScheduler.ensureChannels(context)
        val blockId = block.optString("id")
        val activity = block.optString("activity", "Next block")
        val lead = AlarmStore(context).settings().optInt("preReminderMinutes", 5)

        fun action(actionName: String, label: String): NotificationCompat.Action {
            val i = Intent(context, AlarmActionReceiver::class.java).apply {
                this.action = actionName
                putExtra("block", block.toString())
                putExtra("date", date)
                putExtra("source", "pre_reminder")
            }
            val pi = PendingIntent.getBroadcast(
                context,
                (blockId + actionName).hashCode(),
                i,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
            return NotificationCompat.Action(0, label, pi)
        }

        val open = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
            putExtra("route", "/timetable")
        }
        val contentPi = PendingIntent.getActivity(
            context,
            blockId.hashCode(),
            open,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val notification = NotificationCompat.Builder(context, AlarmScheduler.CHANNEL_REMINDERS)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("$activity starts in $lead minutes")
            .setContentText("Prepare yourself — $activity is coming up.")
            .setContentIntent(contentPi)
            .setAutoCancel(true)
            .addAction(action("com.arise.os.action.PRE_OPEN", "Open"))
            .addAction(action("com.arise.os.action.PRE_SKIP", "Skip"))
            .addAction(action("com.arise.os.action.PRE_SNOOZE", "Snooze 5 min"))
            .build()

        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(("pre:$blockId").hashCode(), notification)
    }
}
