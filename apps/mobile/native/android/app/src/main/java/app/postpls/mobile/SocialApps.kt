package app.postpls.mobile

/**
 * The apps the watcher recognises out of the box.
 *
 * Kept as data rather than baked into the watcher's logic, and deliberately not
 * keyed to any single platform's behaviour: everything downstream treats these
 * as opaque package names, so adding one is a one-line change here.
 */
object SocialApps {
    val PACKAGES = setOf(
        "com.instagram.android",
        "com.zhiliaoapp.musically", // TikTok
        "com.ss.android.ugc.trill", // TikTok (some regions)
        "com.twitter.android",
        "com.x.android",
        "com.linkedin.android",
        "com.facebook.katana",
        "com.facebook.lite",
        "com.google.android.youtube",
        "com.reddit.frontpage",
        "com.pinterest",
        "org.telegram.messenger",
        "com.discord",
        "com.whatsapp",
        "com.threads.android",
        "com.instagram.barcelona", // Threads
        "xyz.blueskyweb.app",
        "com.mastodon.android",
        "org.joinmastodon.android",
        "com.snapchat.android",
        "com.medium.reader",
        "com.tumblr"
    )

    fun isSocial(packageName: String) = PACKAGES.contains(packageName)
}
