package com.arise.os.alarm

import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.core.app.NotificationCompat
import org.json.JSONObject

/**
 * Foreground service that IS the ringing alarm:
 *   - looping alarm audio on the ALARM stream (volume from alarm_config)
 *   - continuous vibration waveform
 *   - full-screen-intent notification → AlarmActivity over the lock screen
 *   - partial wake lock while ringing
 *   - attempt state machine: no user action within alarmRepeatGapSec →
 *     stop, schedule attempt n+1 (max alarmRepeatCount), then MISSED.
 *
 * Handler-based timeout (not AlarmManager) is Doze-safe here because the
 * foreground service holds a wake lock while ringing.
 */
class AlarmService : Service() {
    companion object {
        const val NOTIFICATION_ID = 0xA1A3
        var firedAtMs: Long = 0L // AlarmActivity reads this for responseMs
            private set
    }

    private var player: MediaPlayer? = null
    private var vibrator: Vibrator? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private val handler = Handler(Looper.getMainLooper())
    private var timeout: Runnable? = null

    private var block: JSONObject = JSONObject()
    private var date: String = ""
    private var attempt: Int = 1

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val blockJson = intent?.getStringExtra("block")
        if (blockJson == null) {
            stopSelf()
            return START_NOT_STICKY
        }
        block = runCatching { JSONObject(blockJson) }.getOrDefault(JSONObject())
        date = intent.getStringExtra("date") ?: ""
        attempt = intent.getIntExtra("attempt", 1)
        firedAtMs = System.currentTimeMillis()

        val store = AlarmStore(this)
        if (store.isResolved(block.optString("id"), date)) {
            stopSelf()
            return START_NOT_STICKY
        }

        AlarmScheduler.ensureChannels(this)
        startForeground(NOTIFICATION_ID, buildNotification())
        acquireWakeLock()
        startSound(store)
        startVibration(store)
        EventQueue(this).enqueue(block.optString("id"), date, "FIRED", attempt)

        // Missed-attempt timeout.
        val settings = store.settings()
        val gapMs = settings.optInt("alarmRepeatGapSec", 120) * 1000L
        val maxAttempts = settings.optInt("alarmRepeatCount", 3)
        timeout = Runnable { onTimeout(maxAttempts, gapMs) }.also {
            handler.postDelayed(it, gapMs)
        }

        // Launch the full-screen activity directly too (some launchers delay FSI).
        startActivity(Intent(this, AlarmActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            putExtra("block", block.toString())
            putExtra("date", date)
            putExtra("attempt", attempt)
        })

        return START_NOT_STICKY
    }

    private fun onTimeout(maxAttempts: Int, gapMs: Long) {
        val store = AlarmStore(this)
        val blockId = block.optString("id")
        if (attempt < maxAttempts) {
            // Stop ringing now, re-fire after the same gap (next attempt logs
            // its own FIRED event when it starts).
            AlarmScheduler.scheduleRepeat(this, block, date, attempt + 1, gapMs)
        } else {
            EventQueue(this).enqueue(blockId, date, "MISSED", attempt)
            store.markResolved(blockId, date)
            postMissedSummary()
        }
        stopRinging()
        stopSelf()
    }

    private fun postMissedSummary() {
        val activityName = block.optString("activity", "Block")
        val open = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            putExtra("route", "/timetable")
        }
        val pi = PendingIntent.getActivity(
            this, ("missed" + block.optString("id")).hashCode(), open,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val n = NotificationCompat.Builder(this, AlarmScheduler.CHANNEL_REMINDERS)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle("Missed: $activityName")
            .setContentText("The alarm went unanswered after $attempt attempts.")
            .setContentIntent(pi)
            .setAutoCancel(true)
            .build()
        (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
            .notify(("missed:" + block.optString("id")).hashCode(), n)
    }

    private fun buildNotification(): Notification {
        val fullScreen = Intent(this, AlarmActivity::class.java).apply {
            putExtra("block", block.toString())
            putExtra("date", date)
            putExtra("attempt", attempt)
        }
        val fullScreenPi = PendingIntent.getActivity(
            this, 1, fullScreen,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        fun action(actionName: String, label: String): NotificationCompat.Action {
            val i = Intent(this, AlarmActionReceiver::class.java).apply {
                this.action = actionName
                putExtra("block", block.toString())
                putExtra("date", date)
                putExtra("attempt", attempt)
                putExtra("source", "notification")
            }
            val pi = PendingIntent.getBroadcast(
                this, (block.optString("id") + actionName).hashCode(), i,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
            return NotificationCompat.Action(0, label, pi)
        }

        val start = "%02d:%02d".format(block.optInt("startHour"), block.optInt("startMin"))
        return NotificationCompat.Builder(this, AlarmScheduler.CHANNEL_ALARMS)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("⏰ ${block.optString("activity", "Block")} — $start")
            .setContentText("Attempt $attempt. Confirm, skip, or snooze to stop the alarm.")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setOngoing(true)          // no swipe dismiss
            .setAutoCancel(false)
            .setFullScreenIntent(fullScreenPi, true)
            .addAction(action("com.arise.os.action.CONFIRM", "✅ Confirm"))
            .addAction(action("com.arise.os.action.SKIP", "❌ Skip"))
            .addAction(action("com.arise.os.action.SNOOZE", "⏰ Snooze"))
            .build()
    }

    private fun startSound(store: AlarmStore) {
        val config = store.settings().optJSONObject("alarmConfig") ?: JSONObject()
        val volume = config.optDouble("volume", 0.8).toFloat().coerceIn(0f, 1f)
        val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
            ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
            ?: return
        player = MediaPlayer().apply {
            setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build(),
            )
            setDataSource(this@AlarmService, uri)
            isLooping = true
            setVolume(volume, volume)
            prepare()
            start()
        }
    }

    private fun startVibration(store: AlarmStore) {
        val config = store.settings().optJSONObject("alarmConfig") ?: JSONObject()
        if (!config.optBoolean("vibration", true)) return
        vibrator = if (Build.VERSION.SDK_INT >= 31) {
            (getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }
        val pattern = longArrayOf(0, 800, 400, 800, 400)
        vibrator?.vibrate(VibrationEffect.createWaveform(pattern, 0))
    }

    private fun acquireWakeLock() {
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "arise:alarm").apply {
            acquire(10 * 60 * 1000L)
        }
    }

    private fun stopRinging() {
        timeout?.let { handler.removeCallbacks(it) }
        timeout = null
        runCatching { player?.stop() }
        runCatching { player?.release() }
        player = null
        vibrator?.cancel()
        vibrator = null
        wakeLock?.let { if (it.isHeld) it.release() }
        wakeLock = null
    }

    override fun onDestroy() {
        stopRinging()
        super.onDestroy()
    }
}
