package app.postpls.mobile

import android.os.Bundle
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // Plugins have to be registered before Capacitor builds the bridge,
        // otherwise the JS side sees them as unimplemented.
        registerPlugin(NfcWriterPlugin::class.java)
        registerPlugin(AppWatcherPlugin::class.java)
        registerPlugin(HostWakePlugin::class.java)
        registerPlugin(GoogleDriveAuthPlugin::class.java)
        super.onCreate(savedInstanceState)
    }
}
