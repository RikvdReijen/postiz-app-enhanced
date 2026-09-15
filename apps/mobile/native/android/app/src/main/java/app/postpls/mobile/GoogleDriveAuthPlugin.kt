package app.postpls.mobile

import android.accounts.AccountManager
import android.app.Activity
import android.content.Intent
import androidx.activity.result.ActivityResult
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import com.google.android.gms.auth.GoogleAuthUtil
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.Scope
import kotlin.concurrent.thread

/**
 * Google sign-in for the Drive fallback.
 *
 * Only `drive.file` is requested, so the app can see the files it created and
 * nothing else in the user's Drive — the same scope the host asks for, which is
 * what lets the two sides share one bundle.
 */
@CapacitorPlugin(name = "GoogleDriveAuth")
class GoogleDriveAuthPlugin : Plugin() {

    companion object {
        private const val DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file"
        private const val TOKEN_SCOPE = "oauth2:$DRIVE_SCOPE"
    }

    private fun options(): GoogleSignInOptions =
        GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestEmail()
            .requestScopes(Scope(DRIVE_SCOPE))
            .build()

    @PluginMethod
    fun signIn(call: PluginCall) {
        val client = GoogleSignIn.getClient(activity, options())
        startActivityForResult(call, client.signInIntent, "handleSignIn")
    }

    @ActivityCallback
    private fun handleSignIn(call: PluginCall?, result: ActivityResult) {
        if (call == null) {
            return
        }

        if (result.resultCode != Activity.RESULT_OK) {
            call.reject("Sign-in was cancelled")
            return
        }

        try {
            val account = GoogleSignIn.getSignedInAccountFromIntent(result.data)
                .getResult(com.google.android.gms.common.api.ApiException::class.java)

            val email = account?.email
            if (email.isNullOrBlank()) {
                call.reject("Google did not return an account")
                return
            }

            fetchToken(email) { token, error ->
                if (token == null) {
                    call.reject(error ?: "Could not get a Drive token")
                } else {
                    call.resolve(JSObject().put("email", email).put("accessToken", token))
                }
            }
        } catch (error: Exception) {
            call.reject(error.message ?: "Sign-in failed")
        }
    }

    @PluginMethod
    fun getAccessToken(call: PluginCall) {
        val email = GoogleSignIn.getLastSignedInAccount(context)?.email
        if (email.isNullOrBlank()) {
            call.reject("Google Drive is not connected")
            return
        }

        fetchToken(email) { token, error ->
            if (token == null) {
                call.reject(error ?: "Could not refresh the Drive token")
            } else {
                call.resolve(JSObject().put("accessToken", token))
            }
        }
    }

    @PluginMethod
    fun signOut(call: PluginCall) {
        GoogleSignIn.getClient(activity, options()).signOut()
        call.resolve()
    }

    /**
     * GoogleAuthUtil blocks, so it must not run on the main thread. It returns
     * a cached token where one is still valid and refreshes silently otherwise.
     */
    private fun fetchToken(email: String, onResult: (String?, String?) -> Unit) {
        thread {
            try {
                val account = AccountManager.get(context).accounts
                    .firstOrNull { it.name == email && it.type == "com.google" }
                    ?: run {
                        onResult(null, "That Google account is no longer on this device")
                        return@thread
                    }

                onResult(GoogleAuthUtil.getToken(context, account, TOKEN_SCOPE), null)
            } catch (error: Exception) {
                onResult(null, error.message)
            }
        }
    }
}
