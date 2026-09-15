package app.postpls.mobile

import android.content.Context
import android.net.wifi.WifiManager
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress

/**
 * Wake-on-LAN. Sends the magic packet to the local broadcast address, which
 * only works while the phone is on the same network as the host — see the
 * tracking issue for the remote path.
 */
@CapacitorPlugin(name = "HostWake")
class HostWakePlugin : Plugin() {

    @PluginMethod
    fun wake(call: PluginCall) {
        val macAddress = call.getString("macAddress")
        if (macAddress.isNullOrBlank()) {
            call.reject("A macAddress is required")
            return
        }

        val mac = try {
            parseMac(macAddress)
        } catch (error: IllegalArgumentException) {
            call.reject(error.message ?: "Invalid MAC address")
            return
        }

        val port = call.getInt("port") ?: 9
        val broadcast = call.getString("broadcastAddress") ?: defaultBroadcast()

        try {
            // 6 bytes of 0xFF, then the MAC repeated 16 times.
            val payload = ByteArray(6 + 16 * mac.size)
            for (index in 0 until 6) {
                payload[index] = 0xFF.toByte()
            }
            for (repeat in 0 until 16) {
                System.arraycopy(mac, 0, payload, 6 + repeat * mac.size, mac.size)
            }

            DatagramSocket().use { socket ->
                socket.broadcast = true
                socket.send(
                    DatagramPacket(
                        payload,
                        payload.size,
                        InetAddress.getByName(broadcast),
                        port
                    )
                )
            }

            call.resolve(JSObject().put("sent", true))
        } catch (error: Exception) {
            call.reject(error.message ?: "Could not send the magic packet")
        }
    }

    private fun parseMac(value: String): ByteArray {
        val parts = value.trim().split(':', '-')
        require(parts.size == 6) { "A MAC address has six parts" }

        return ByteArray(6) { index ->
            val part = parts[index]
            require(part.length == 2) { "A MAC address part has two digits" }
            part.toInt(16).toByte()
        }
    }

    /**
     * The subnet's directed broadcast. 255.255.255.255 is dropped by a lot of
     * consumer routers, so deriving it from the phone's own lease works far
     * more often.
     */
    private fun defaultBroadcast(): String {
        val wifi = context.applicationContext.getSystemService(Context.WIFI_SERVICE)
            as? WifiManager ?: return "255.255.255.255"

        @Suppress("DEPRECATION")
        val info = wifi.dhcpInfo ?: return "255.255.255.255"

        @Suppress("DEPRECATION")
        val broadcast = (info.ipAddress and info.netmask) or info.netmask.inv()
        if (broadcast == 0 || info.netmask == 0) {
            return "255.255.255.255"
        }

        return (0..3).joinToString(".") { ((broadcast shr (it * 8)) and 0xFF).toString() }
    }
}
