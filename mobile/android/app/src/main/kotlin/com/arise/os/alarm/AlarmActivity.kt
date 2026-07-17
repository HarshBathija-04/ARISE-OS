package com.arise.os.alarm

import android.app.Activity
import android.app.AlertDialog
import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import org.json.JSONObject

/**
 * Native full-screen alarm UI. Runs engine-cold (no Flutter), over the lock
 * screen, and cannot be dismissed except via Confirm / Skip / Snooze.
 * UI is built in code — no XML layout, no Compose dependency.
 */
class AlarmActivity : Activity() {
    private lateinit var block: JSONObject
    private lateinit var date: String
    private var attempt = 1

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        block = runCatching { JSONObject(intent.getStringExtra("block") ?: "{}") }
            .getOrDefault(JSONObject())
        date = intent.getStringExtra("date") ?: ""
        attempt = intent.getIntExtra("attempt", 1)

        setShowWhenLocked(true)
        setTurnScreenOn(true)
        (getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager)
            .requestDismissKeyguard(this, null)

        setContentView(buildUi())
    }

    // No back-dismiss: the alarm requires an explicit choice.
    @Deprecated("Deprecated in Android 13; behavior intentional")
    override fun onBackPressed() {
        // swallow
    }

    private fun buildUi(): View {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(Color.parseColor("#04050A"))
            setPadding(48, 48, 48, 48)
        }

        val start = "%02d:%02d".format(block.optInt("startHour"), block.optInt("startMin"))
        root.addView(TextView(this).apply {
            text = "⏰ SCHEDULED BLOCK"
            setTextColor(Color.parseColor("#7C5CFF"))
            textSize = 14f
            letterSpacing = 0.25f
            gravity = Gravity.CENTER
        })
        root.addView(TextView(this).apply {
            text = block.optString("activity", "Block")
            setTextColor(Color.WHITE)
            textSize = 36f
            setTypeface(typeface, Typeface.BOLD)
            gravity = Gravity.CENTER
            setPadding(0, 24, 0, 8)
        })
        root.addView(TextView(this).apply {
            text = start + if (attempt > 1) "   •   attempt $attempt" else ""
            setTextColor(Color.parseColor("#94A3B8"))
            textSize = 18f
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 64)
        })

        fun button(label: String, bg: String, fg: String, onClick: () -> Unit) = Button(this).apply {
            text = label
            textSize = 18f
            isAllCaps = false
            setTextColor(Color.parseColor(fg))
            setBackgroundColor(Color.parseColor(bg))
            setPadding(32, 36, 32, 36)
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT,
            ).apply { topMargin = 24 }
            setOnClickListener { onClick() }
        }

        root.addView(button("✅  Confirm — start now", "#16A34A", "#FFFFFF") { confirm() })
        root.addView(button("⏰  Snooze", "#1E293B", "#E2E8F0") { snoozePicker() })
        root.addView(button("❌  Skip", "#7F1D1D", "#FECACA") { skipPicker() })
        return root
    }

    private fun confirm() {
        AlarmActions.confirm(this, block, date, responseMs())
        finishAndOpenApp("confirm")
    }

    private fun snoozePicker() {
        val store = AlarmStore(this)
        val config = store.settings().optJSONObject("alarmConfig") ?: JSONObject()
        val opts = config.optJSONArray("snoozeOptions")
        val minutes = ArrayList<Int>()
        if (opts != null) for (i in 0 until opts.length()) minutes.add(opts.optInt(i))
        if (minutes.isEmpty()) minutes.addAll(listOf(5, 10, 15))

        AlertDialog.Builder(this)
            .setTitle("Snooze for…")
            .setItems(minutes.map { "$it minutes" }.toTypedArray()) { _, which ->
                AlarmActions.snooze(this, block, date, minutes[which], responseMs())
                finish()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun skipPicker() {
        val reasons = arrayOf("Busy", "Not feeling well", "Already completed", "Reschedule", "Other")
        AlertDialog.Builder(this)
            .setTitle("Why are you skipping?")
            .setItems(reasons) { _, which ->
                AlarmActions.skip(this, block, date, reasons[which], responseMs())
                finish()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun responseMs(): Long =
        if (AlarmService.firedAtMs > 0) System.currentTimeMillis() - AlarmService.firedAtMs else 0

    private fun finishAndOpenApp(action: String) {
        val blockId = block.optString("id")
        val launch = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            putExtra("route", "/alarm-result?blockId=$blockId&date=$date&action=$action")
        }
        if (launch != null) startActivity(launch)
        finish()
    }
}
