package com.arise.os.alarm

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject

/**
 * Native persistence for the alarm plan — readable with NO Flutter engine,
 * so BootReceiver/AlarmReceiver work app-killed and offline.
 *
 * Layout (SharedPreferences "arise_alarms"):
 *   plan      — the /v1/alarms/plan JSON handed over by Dart (version, settings, blocks)
 *   attempts  — { "<blockId>:<date>": attemptCount }
 *   snoozes   — { "<blockId>:<date>": snoozeCount }
 *   resolved  — [ "<blockId>:<date>", ... ] blocks already confirmed/skipped today
 *   dirty     — true when a background resync failed and Dart must re-sync on resume
 */
class AlarmStore(context: Context) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences("arise_alarms", Context.MODE_PRIVATE)

    // ── Plan ──

    fun savePlan(planJson: String) {
        prefs.edit().putString("plan", planJson).apply()
    }

    fun loadPlan(): JSONObject? =
        prefs.getString("plan", null)?.let { runCatching { JSONObject(it) }.getOrNull() }

    fun planVersion(): Int = loadPlan()?.optInt("version", 0) ?: 0

    fun settings(): JSONObject = loadPlan()?.optJSONObject("settings") ?: JSONObject()

    fun blocks(): JSONArray = loadPlan()?.optJSONArray("blocks") ?: JSONArray()

    fun timezone(): String = loadPlan()?.optString("timezone", "Asia/Kolkata") ?: "Asia/Kolkata"

    // ── Attempt / snooze counters (per block per day) ──

    private fun counter(key: String, id: String): Int =
        runCatching { JSONObject(prefs.getString(key, "{}") ?: "{}").optInt(id, 0) }.getOrDefault(0)

    private fun bumpCounter(key: String, id: String): Int {
        val obj = runCatching { JSONObject(prefs.getString(key, "{}") ?: "{}") }.getOrDefault(JSONObject())
        val next = obj.optInt(id, 0) + 1
        obj.put(id, next)
        prefs.edit().putString(key, obj.toString()).apply()
        return next
    }

    private fun resetCounter(key: String, id: String) {
        val obj = runCatching { JSONObject(prefs.getString(key, "{}") ?: "{}") }.getOrDefault(JSONObject())
        obj.remove(id)
        prefs.edit().putString(key, obj.toString()).apply()
    }

    fun attemptCount(blockId: String, date: String): Int = counter("attempts", "$blockId:$date")
    fun bumpAttempt(blockId: String, date: String): Int = bumpCounter("attempts", "$blockId:$date")
    fun resetAttempts(blockId: String, date: String) = resetCounter("attempts", "$blockId:$date")

    fun snoozeCount(blockId: String, date: String): Int = counter("snoozes", "$blockId:$date")
    fun bumpSnooze(blockId: String, date: String): Int = bumpCounter("snoozes", "$blockId:$date")

    // ── Resolved blocks (confirmed/skipped/missed — don't re-fire today) ──

    fun markResolved(blockId: String, date: String) {
        val arr = runCatching { JSONArray(prefs.getString("resolved", "[]") ?: "[]") }
            .getOrDefault(JSONArray())
        arr.put("$blockId:$date")
        prefs.edit().putString("resolved", arr.toString()).apply()
    }

    fun isResolved(blockId: String, date: String): Boolean {
        val arr = runCatching { JSONArray(prefs.getString("resolved", "[]") ?: "[]") }
            .getOrDefault(JSONArray())
        for (i in 0 until arr.length()) if (arr.optString(i) == "$blockId:$date") return true
        return false
    }

    /** Trim day-scoped state so prefs don't grow forever. Keeps only `keepDate`. */
    fun pruneOtherDays(keepDate: String) {
        for (key in listOf("attempts", "snoozes")) {
            val obj = runCatching { JSONObject(prefs.getString(key, "{}") ?: "{}") }
                .getOrDefault(JSONObject())
            val out = JSONObject()
            for (k in obj.keys()) if (k.endsWith(":$keepDate")) out.put(k, obj.get(k))
            prefs.edit().putString(key, out.toString()).apply()
        }
        val arr = runCatching { JSONArray(prefs.getString("resolved", "[]") ?: "[]") }
            .getOrDefault(JSONArray())
        val out = JSONArray()
        for (i in 0 until arr.length()) {
            val v = arr.optString(i)
            if (v.endsWith(":$keepDate")) out.put(v)
        }
        prefs.edit().putString("resolved", out.toString()).apply()
    }

    // ── Dirty flag (background resync failed → Dart re-syncs on resume) ──

    fun setDirty(dirty: Boolean) = prefs.edit().putBoolean("dirty", dirty).apply()
    fun isDirty(): Boolean = prefs.getBoolean("dirty", false)
}
