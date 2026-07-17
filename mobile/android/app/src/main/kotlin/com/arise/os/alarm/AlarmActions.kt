package com.arise.os.alarm

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import org.json.JSONObject

/**
 * Shared alarm-resolution logic used by both AlarmActivity (full-screen UI)
 * and AlarmActionReceiver (notification buttons). Everything is offline-safe:
 * events go to the EventQueue; the API call happens later from Dart.
 */
object AlarmActions {
    private fun stopService(context: Context) {
        context.stopService(Intent(context, AlarmService::class.java))
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.cancel(AlarmService.NOTIFICATION_ID)
    }

    fun confirm(context: Context, block: JSONObject, date: String, responseMs: Long) {
        val blockId = block.optString("id")
        stopService(context)
        AlarmStore(context).markResolved(blockId, date)
        EventQueue(context).enqueue(blockId, date, "CONFIRMED", responseMs = responseMs)
    }

    fun skip(context: Context, block: JSONObject, date: String, reason: String, responseMs: Long) {
        val blockId = block.optString("id")
        stopService(context)
        AlarmStore(context).markResolved(blockId, date)
        EventQueue(context).enqueue(blockId, date, "SKIPPED", skipReason = reason, responseMs = responseMs)
    }

    fun snooze(context: Context, block: JSONObject, date: String, minutes: Int, responseMs: Long) {
        val blockId = block.optString("id")
        stopService(context)
        val store = AlarmStore(context)
        val count = store.bumpSnooze(blockId, date)
        EventQueue(context).enqueue(blockId, date, "SNOOZED", snoozeMinutes = minutes, responseMs = responseMs)
        if (count > 3) {
            // Snooze cap: treat as missed to avoid infinite loops.
            store.markResolved(blockId, date)
            EventQueue(context).enqueue(blockId, date, "MISSED", attempt = count)
            return
        }
        // Snooze resets the attempt counter — the user explicitly engaged.
        store.resetAttempts(blockId, date)
        AlarmScheduler.scheduleRepeat(context, block, date, 1, minutes * 60_000L)
    }
}
