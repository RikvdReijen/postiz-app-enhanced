package app.postpls.mobile

import android.app.AppOpsManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Process
import android.provider.Settings
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "AppWatcher")
class AppWatcherPlugin : Plugin() {

    private var watched: Array<String> = emptyArray()
    private var actions: Array<String> = emptyArray()

    @PluginMethod
    fun hasPermission(call: PluginCall) {
        call.resolve(JSObject().put("granted", hasUsageAccess()))
    }

    @PluginMethod
    fun openPermissionSettings(call: PluginCall) {
        // Usage access is not a runtime permission; it can only be granted from
        // this Settings screen.
        val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        call.resolve()
    }

    @PluginMethod
    fun listInstalledApps(call: PluginCall) {
        val manager = context.packageManager
        val launcherIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)

        val apps = JSArray()
        // Launchable apps only: services and system components are noise in a
        // picker the user has to scroll through.
        for (resolved in manager.queryIntentActivities(launcherIntent, 0)) {
            val packageName = resolved.activityInfo.packageName
            if (packageName == context.packageName) {
                continue
            }

            apps.put(
                JSObject()
                    .put("packageName", packageName)
                    .put("label", resolved.loadLabel(manager).toString())
                    .put("social", SocialApps.isSocial(packageName))
            )
        }

        call.resolve(JSObject().put("apps", apps))
    }

    @PluginMethod
    fun setWatchedApps(call: PluginCall) {
        watched = call.getArray("packages")?.toList<String>()?.toTypedArray() ?: emptyArray()
        if (isRunning()) {
            startService()
        }
        call.resolve()
    }

    @PluginMethod
    fun setQuickActions(call: PluginCall) {
        val list = call.getArray("actions")
        actions = (0 until (list?.length() ?: 0)).mapNotNull { index ->
            val entry = list?.getJSONObject(index) ?: return@mapNotNull null
            val id = entry.optString("id")
            val label = entry.optString("label")
            val deepLink = entry.optString("deepLink")

            // The service reads these as id|label|deepLink, so a separator in
            // the label would corrupt the following field.
            if (id.isBlank() || label.isBlank() || deepLink.isBlank()) {
                null
            } else {
                "$id|${label.replace('|', '/')}|$deepLink"
            }
        }.toTypedArray()

        if (isRunning()) {
            startService()
        }
        call.resolve()
    }

    @PluginMethod
    fun start(call: PluginCall) {
        if (!hasUsageAccess()) {
            call.reject("Usage access has not been granted")
            return
        }

        startService()
        call.resolve()
    }

    @PluginMethod
    fun stop(call: PluginCall) {
        context.stopService(Intent(context, AppWatcherService::class.java))
        call.resolve()
    }

    @PluginMethod
    fun isRunning(call: PluginCall) {
        call.resolve(JSObject().put("running", isRunning()))
    }

    private fun startService() {
        val intent = Intent(context, AppWatcherService::class.java)
            .putExtra(AppWatcherService.EXTRA_PACKAGES, watched)
            .putExtra(AppWatcherService.EXTRA_ACTIONS, actions)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent)
        } else {
            context.startService(intent)
        }
    }

    @Suppress("DEPRECATION")
    private fun isRunning(): Boolean {
        val manager = context.getSystemService(Context.ACTIVITY_SERVICE)
            as? android.app.ActivityManager ?: return false

        return manager.getRunningServices(Integer.MAX_VALUE).any {
            it.service.className == AppWatcherService::class.java.name
        }
    }

    private fun hasUsageAccess(): Boolean {
        val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as? AppOpsManager
            ?: return false

        val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            appOps.unsafeCheckOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                Process.myUid(),
                context.packageName
            )
        } else {
            @Suppress("DEPRECATION")
            appOps.checkOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                Process.myUid(),
                context.packageName
            )
        }

        return mode == AppOpsManager.MODE_ALLOWED
    }
}
