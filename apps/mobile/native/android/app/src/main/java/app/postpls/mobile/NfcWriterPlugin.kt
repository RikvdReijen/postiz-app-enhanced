package app.postpls.mobile

import android.app.Activity
import android.nfc.NdefMessage
import android.nfc.NdefRecord
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.nfc.tech.Ndef
import android.nfc.tech.NdefFormatable
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Writes a URL to an NFC tag.
 *
 * Reader mode rather than foreground dispatch: it keeps the platform's own
 * "tag discovered" chooser out of the way while the user is deliberately
 * writing, which is the whole interaction here.
 */
@CapacitorPlugin(name = "NfcWriter")
class NfcWriterPlugin : Plugin() {

    private var pendingCall: PluginCall? = null

    private val adapter: NfcAdapter?
        get() = NfcAdapter.getDefaultAdapter(context)

    @PluginMethod
    fun isAvailable(call: PluginCall) {
        val nfc = adapter
        call.resolve(
            JSObject()
                .put("available", nfc != null)
                .put("enabled", nfc?.isEnabled == true)
        )
    }

    @PluginMethod
    fun writeUrl(call: PluginCall) {
        val url = call.getString("url")
        if (url.isNullOrBlank()) {
            call.reject("A url is required")
            return
        }

        val nfc = adapter
        if (nfc == null) {
            call.reject("This device has no NFC hardware")
            return
        }

        if (!nfc.isEnabled) {
            call.reject("NFC is switched off")
            return
        }

        // Held across the callback so the JS promise settles on the tap, not on
        // the call that armed the reader.
        pendingCall = call
        call.setKeepAlive(true)

        nfc.enableReaderMode(
            activity,
            { tag -> onTagDiscovered(tag, url) },
            NfcAdapter.FLAG_READER_NFC_A or
                NfcAdapter.FLAG_READER_NFC_B or
                NfcAdapter.FLAG_READER_NFC_F or
                NfcAdapter.FLAG_READER_NFC_V or
                NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK,
            null
        )
    }

    @PluginMethod
    fun cancel(call: PluginCall) {
        disableReader()
        pendingCall?.reject("Cancelled")
        pendingCall = null
        call.resolve()
    }

    private fun onTagDiscovered(tag: Tag, url: String) {
        val call = pendingCall ?: return
        val message = NdefMessage(arrayOf(NdefRecord.createUri(url)))

        try {
            val ndef = Ndef.get(tag)
            if (ndef != null) {
                ndef.connect()
                try {
                    if (!ndef.isWritable) {
                        call.reject("That tag is read-only")
                        return
                    }

                    if (ndef.maxSize < message.toByteArray().size) {
                        call.reject("That tag is too small for this link")
                        return
                    }

                    ndef.writeNdefMessage(message)
                } finally {
                    ndef.close()
                }
            } else {
                // A blank factory tag has no NDEF structure yet.
                val formatable = NdefFormatable.get(tag)
                    ?: run {
                        call.reject("That tag cannot store a link")
                        return
                    }

                formatable.connect()
                try {
                    formatable.format(message)
                } finally {
                    formatable.close()
                }
            }

            call.resolve(JSObject().put("written", true))
        } catch (error: Exception) {
            call.reject(error.message ?: "Could not write the tag")
        } finally {
            pendingCall = null
            activity.runOnUiThread { disableReader() }
        }
    }

    private fun disableReader() {
        val currentActivity: Activity = activity ?: return
        adapter?.disableReaderMode(currentActivity)
    }

    override fun handleOnPause() {
        super.handleOnPause()
        // Reader mode is tied to a resumed activity; leaving it armed in the
        // background is both useless and a battery drain.
        disableReader()
    }
}
