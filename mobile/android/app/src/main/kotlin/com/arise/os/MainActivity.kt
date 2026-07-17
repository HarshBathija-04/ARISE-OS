package com.arise.os

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import com.arise.os.alarm.AlarmScheduler
import com.arise.os.alarm.AlarmStore
import com.arise.os.alarm.EventQueue
import com.arise.os.alarm.RescheduleWorker
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import org.json.JSONObject

class MainActivity : FlutterActivity() {
    private val channelName = "com.arise.os/alarms"
    private var channel: MethodChannel? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        AlarmScheduler.ensureChannels(this)
        RescheduleWorker.ensureScheduled(this)

        channel = MethodChannel(flutterEngine.dartExecutor.binaryMessenger, channelName)
        channel?.setMethodCallHandler { call, result ->
            val store = AlarmStore(this)
            when (call.method) {
                "syncAlarms" -> {
                    val planJson = call.argument<String>("plan")
                    if (planJson == null) {
                        result.error("ARG", "plan missing", null)
                    } else {
                        AlarmScheduler.cancelAll(this, store.blocks())
                        store.savePlan(planJson)
                        store.setDirty(false)
                        val scheduled = AlarmScheduler.rescheduleAll(this)
                        result.success(mapOf("scheduled" to scheduled, "version" to store.planVersion()))
                    }
                }
                "cancelAll" -> {
                    AlarmScheduler.cancelAll(this)
                    result.success(true)
                }
                "getNativeState" -> {
                    val pm = getSystemService(POWER_SERVICE) as PowerManager
                    result.success(
                        mapOf(
                            "version" to store.planVersion(),
                            "dirty" to store.isDirty(),
                            "canExactAlarm" to AlarmScheduler.canScheduleExact(this),
                            "notificationsEnabled" to
                                NotificationManagerCompat.from(this).areNotificationsEnabled(),
                            "batteryOptimized" to !pm.isIgnoringBatteryOptimizations(packageName),
                            "canFullScreenIntent" to canUseFullScreenIntent(),
                        ),
                    )
                }
                "drainEventQueue" -> result.success(EventQueue(this).drain())
                "requeueEvents" -> {
                    call.argument<String>("events")?.let { EventQueue(this).requeue(it) }
                    result.success(true)
                }
                "openExactAlarmSettings" -> {
                    if (Build.VERSION.SDK_INT >= 31) {
                        startActivity(
                            Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM)
                                .setData(Uri.parse("package:$packageName")),
                        )
                    }
                    result.success(true)
                }
                "openBatteryOptimizationSettings" -> {
                    startActivity(
                        Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
                            .setData(Uri.parse("package:$packageName")),
                    )
                    result.success(true)
                }
                "openFullScreenIntentSettings" -> {
                    if (Build.VERSION.SDK_INT >= 34) {
                        startActivity(
                            Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT)
                                .setData(Uri.parse("package:$packageName")),
                        )
                    }
                    result.success(true)
                }
                "testAlarm" -> {
                    val blockJson = call.argument<String>("block")
                        ?: JSONObject()
                            .put("id", "test-block")
                            .put("activity", "Test Alarm")
                            .put("startHour", 0)
                            .put("startMin", 0)
                            .toString()
                    AlarmScheduler.scheduleTest(this, blockJson, call.argument<Int>("seconds") ?: 10)
                    result.success(true)
                }
                "getLaunchRoute" -> result.success(intent?.getStringExtra("route"))
                else -> result.notImplemented()
            }
        }
    }

    private fun canUseFullScreenIntent(): Boolean {
        if (Build.VERSION.SDK_INT < 34) return true
        val nm = getSystemService(NOTIFICATION_SERVICE) as android.app.NotificationManager
        return nm.canUseFullScreenIntent()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        // Warm-start deep link (alarm confirm while the app is alive).
        intent.getStringExtra("route")?.let { route ->
            channel?.invokeMethod("navigateTo", route)
        }
    }
}
