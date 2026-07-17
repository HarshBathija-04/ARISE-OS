package com.arise.os.alarm

import android.content.Context
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import java.util.concurrent.TimeUnit

/**
 * 6-hourly safety pass: re-register alarms from the stored plan so the
 * today+tomorrow horizon stays fresh even if FCM resync messages are dropped
 * by OEM battery killers. Deliberately network-free — the authoritative
 * re-sync (fetching /v1/alarms/plan) happens Dart-side on app resume.
 */
class RescheduleWorker(context: Context, params: WorkerParameters) : Worker(context, params) {
    override fun doWork(): Result {
        AlarmScheduler.rescheduleAll(applicationContext)
        return Result.success()
    }

    companion object {
        fun ensureScheduled(context: Context) {
            val request = PeriodicWorkRequestBuilder<RescheduleWorker>(6, TimeUnit.HOURS).build()
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                "arise-alarm-reschedule",
                ExistingPeriodicWorkPolicy.KEEP,
                request,
            )
        }
    }
}
