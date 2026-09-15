package app.postpls.mobile

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat

/**
 * Raises a PostPls notification when the user opens one of the apps they chose
 * to watch.
 *
 * Android has no callback for "an app came to the foreground" outside of an
 * accessibility service, which is a far heavier permission than this feature
 * deserves. Polling UsageStats is the standard alternative, so the cost is kept
 * down by only polling while the screen is on and by doing nothing at all until
 * the foreground package actually changes.
 */
class AppWatcherService : Service() {

    companion object {
        const val EXTRA_PACKAGES = "packages"
        const val EXTRA_ACTIONS = "actions"

        private const val ONGOING_CHANNEL = "postpls.watcher"
        private const val SHORTCUT_CHANNEL = "postpls.shortcuts"
        private const val ONGOING_ID = 1001
        private const val SHORTCUT_ID = 1002
        private const val POLL_MS = 1500L
        /** How long before the same app can raise the notification again. */
        private const val REPEAT_SUPPRESSION_MS = 5 * 60 * 1000L
    }

    private val handler = Handler(Looper.getMainLooper())
    private var watched: Set<String> = emptySet()
    private var actions: List<Triple<String, String, String>> = emptyList()
    private var lastForeground: String? = null
    private val lastNotifiedAt = mutableMapOf<String, Long>()

    private val poll = object : Runnable {
        override fun run() {
            try {
                checkForeground()
            } catch (error: Exception) {
                // Usage access can be revoked from Settings at any moment; the
                // service should go quiet rather than crash-loop.
            }

            handler.postDelayed(this, POLL_MS)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createChannels()
        startForeground(ONGOING_ID, buildOngoingNotification())
        handler.post(poll)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        intent?.getStringArrayExtra(EXTRA_PACKAGES)?.let { watched = it.toSet() }
        intent?.getStringArrayExtra(EXTRA_ACTIONS)?.let { raw ->
            // Encoded as id|label|deepLink so the service needs no JSON parser.
            actions = raw.mapNotNull { entry ->
                val parts = entry.split('|', limit = 3)
                if (parts.size == 3) Triple(parts[0], parts[1], parts[2]) else null
            }
        }

        return START_STICKY
    }

    override fun onDestroy() {
        handler.removeCallbacks(poll)
        super.onDestroy()
    }

    private fun checkForeground() {
        if (watched.isEmpty()) {
            return
        }

        val usage = getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
            ?: return

        val now = System.currentTimeMillis()
        val events = usage.queryEvents(now - POLL_MS * 4, now)
        val event = UsageEvents.Event()
        var latest: String? = null

        while (events.hasNextEvent()) {
            events.getNextEvent(event)
            if (event.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND) {
                latest = event.packageName
            }
        }

        val foreground = latest ?: return
        if (foreground == lastForeground) {
            return
        }

        lastForeground = foreground
        if (!watched.contains(foreground) || foreground == packageName) {
            return
        }

        // Somebody who flips between two apps should not be nagged each time.
        val previous = lastNotifiedAt[foreground] ?: 0L
        if (now - previous < REPEAT_SUPPRESSION_MS) {
            return
        }

        lastNotifiedAt[foreground] = now
        notifyShortcuts(foreground)
    }

    private fun notifyShortcuts(forPackage: String) {
        val label = try {
            packageManager.getApplicationLabel(
                packageManager.getApplicationInfo(forPackage, 0)
            )
        } catch (error: Exception) {
            forPackage
        }

        val builder = NotificationCompat.Builder(this, SHORTCUT_CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_postpls)
            .setContentTitle("Post this to $label?")
            .setContentText("Jump into PostPls")
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setContentIntent(deepLinkIntent("postpls://open?target=CALENDAR", 0))

        actions.forEachIndexed { index, (_, actionLabel, deepLink) ->
            builder.addAction(
                R.drawable.ic_stat_postpls,
                actionLabel,
                deepLinkIntent(deepLink, index + 1)
            )
        }

        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(SHORTCUT_ID, builder.build())
    }

    private fun deepLinkIntent(deepLink: String, requestCode: Int): PendingIntent {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(deepLink)).apply {
            setPackage(packageName)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }

        return PendingIntent.getActivity(
            this,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private fun buildOngoingNotification(): Notification =
        NotificationCompat.Builder(this, ONGOING_CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_postpls)
            .setContentTitle("PostPls is watching for social apps")
            .setContentText("Tap to change which apps")
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .setOngoing(true)
            .setContentIntent(deepLinkIntent("postpls://open?target=SETTINGS", 100))
            .build()

    private fun createChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return
        }

        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        manager.createNotificationChannel(
            NotificationChannel(
                ONGOING_CHANNEL,
                "Watching for social apps",
                // MIN so the permanent foreground-service notice sits silently
                // at the bottom of the shade.
                NotificationManager.IMPORTANCE_MIN
            )
        )

        manager.createNotificationChannel(
            NotificationChannel(
                SHORTCUT_CHANNEL,
                "PostPls shortcuts",
                NotificationManager.IMPORTANCE_DEFAULT
            )
        )
    }
}
