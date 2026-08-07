package com.atlas.navigation

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

class AtlasNavigationService : Service() {
    companion object {
        const val CHANNEL_ID = "atlas_navigation"
        const val NOTIFICATION_ID = 4104
        const val ACTION_UPDATE_GUIDANCE = "com.atlas.navigation.UPDATE_GUIDANCE"
    }

    private var destinationName = "ATLAS Navigation"
    private var instruction = "Navigation active"
    private var distanceMeters = 0.0
    private var etaEpochMs = 0.0

    override fun onCreate() {
        super.onCreate()
        createChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        destinationName = intent?.getStringExtra("destinationName") ?: destinationName
        if (intent?.action == ACTION_UPDATE_GUIDANCE) {
            instruction = intent.getStringExtra("instruction") ?: instruction
            distanceMeters = intent.getDoubleExtra("distanceMeters", distanceMeters)
            etaEpochMs = intent.getDoubleExtra("etaEpochMs", etaEpochMs)
        }
        startForeground(NOTIFICATION_ID, buildNotification())
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = getSystemService(NotificationManager::class.java)
        val channel = NotificationChannel(
            CHANNEL_ID,
            "ATLAS Navigation",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "Turn-by-turn navigation and background location"
            setShowBadge(false)
            lockscreenVisibility = Notification.VISIBILITY_PUBLIC
        }
        manager.createNotificationChannel(channel)
    }

    private fun buildNotification(): Notification {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = launchIntent?.let {
            PendingIntent.getActivity(
                this,
                0,
                it,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )
        }
        val distanceText = if (distanceMeters >= 1000) {
            String.format("%.1f km", distanceMeters / 1000.0)
        } else if (distanceMeters > 0) {
            "${distanceMeters.toInt()} m"
        } else {
            ""
        }
        val etaText = if (etaEpochMs > 0) " · ETA ${java.text.DateFormat.getTimeInstance(java.text.DateFormat.SHORT).format(java.util.Date(etaEpochMs.toLong()))}" else ""
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_map)
            .setContentTitle(destinationName)
            .setContentText(listOf(distanceText, instruction).filter { it.isNotBlank() }.joinToString(" · ") + etaText)
            .setStyle(NotificationCompat.BigTextStyle().bigText(instruction))
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setCategory(NotificationCompat.CATEGORY_NAVIGATION)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setContentIntent(pendingIntent)
            .build()
    }
}
