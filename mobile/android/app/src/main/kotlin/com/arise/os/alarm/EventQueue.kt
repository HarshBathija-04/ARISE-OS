package com.arise.os.alarm

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject

/**
 * Append-only queue of alarm analytics events created natively (while the
 * Flutter engine may be dead). Drained by Dart on resume and POSTed to
 * /v1/alarms/events in one batch.
 */
class EventQueue(context: Context) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences("arise_alarm_events", Context.MODE_PRIVATE)

    fun enqueue(
        blockId: String,
        date: String,
        event: String,
        attempt: Int = 1,
        snoozeMinutes: Int? = null,
        skipReason: String? = null,
        responseMs: Long? = null,
    ) {
        synchronized(this) {
            val arr = load()
            val obj = JSONObject()
                .put("blockId", blockId)
                .put("date", date)
                .put("event", event)
                .put("attempt", attempt)
            snoozeMinutes?.let { obj.put("snoozeMinutes", it) }
            skipReason?.let { obj.put("skipReason", it) }
            responseMs?.let { obj.put("responseMs", it) }
            arr.put(obj)
            // Cap so a long-offline device can't grow unbounded.
            val trimmed = if (arr.length() > 500) JSONArray().also { out ->
                for (i in arr.length() - 500 until arr.length()) out.put(arr.get(i))
            } else arr
            prefs.edit().putString("queue", trimmed.toString()).apply()
        }
    }

    /** Return the whole queue as a JSON string and clear it (drain-on-read). */
    fun drain(): String {
        synchronized(this) {
            val all = prefs.getString("queue", "[]") ?: "[]"
            prefs.edit().putString("queue", "[]").apply()
            return all
        }
    }

    /** Re-add events if the upload failed. */
    fun requeue(eventsJson: String) {
        synchronized(this) {
            val incoming = runCatching { JSONArray(eventsJson) }.getOrDefault(JSONArray())
            val current = load()
            for (i in 0 until current.length()) incoming.put(current.get(i))
            prefs.edit().putString("queue", incoming.toString()).apply()
        }
    }

    private fun load(): JSONArray =
        runCatching { JSONArray(prefs.getString("queue", "[]") ?: "[]") }.getOrDefault(JSONArray())
}
