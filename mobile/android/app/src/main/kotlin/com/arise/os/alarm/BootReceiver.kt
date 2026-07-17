package com.arise.os.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Restores alarms from the natively-persisted plan (AlarmStore) after events
 * that wipe or invalidate AlarmManager registrations. Works fully offline —
 * no Flutter engine, no network.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_MY_PACKAGE_REPLACED,
            Intent.ACTION_TIMEZONE_CHANGED,
            Intent.ACTION_TIME_CHANGED,
            -> {
                AlarmScheduler.rescheduleAll(context)
                RescheduleWorker.ensureScheduled(context)
            }
        }
    }
}
