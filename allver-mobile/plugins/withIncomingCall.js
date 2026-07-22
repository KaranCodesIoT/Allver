const { withDangerousMod, withAndroidManifest } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// 1. Android Manifest modifications
function modifyManifest(androidManifest) {
  const mainApplication = androidManifest.manifest.application[0];
  
  // Ensure the activity is not already registered
  if (!mainApplication.activity) {
    mainApplication.activity = [];
  }
  
  const hasActivity = mainApplication.activity.some(
    (activity) => activity.$['android:name'] === '.IncomingCallActivity'
  );
  
  if (!hasActivity) {
    mainApplication.activity.push({
      $: {
        'android:name': '.IncomingCallActivity',
        'android:theme': '@android:style/Theme.NoTitleBar.Fullscreen',
        'android:launchMode': 'singleInstance',
        'android:excludeFromRecents': 'true',
        'android:screenOrientation': 'portrait',
        'android:configChanges': 'keyboardHidden|orientation|screenSize'
      }
    });
    console.log('[withIncomingCall] Registered IncomingCallActivity in AndroidManifest.xml');
  }
  
  return androidManifest;
}

// 2. Dangerous Mod modifications (writes Kotlin files and injects package)
module.exports = function withIncomingCall(config) {
  // A. Modify AndroidManifest.xml
  config = withAndroidManifest(config, (config) => {
    config.modResults = modifyManifest(config.modResults);
    return config;
  });

  // B. Write Kotlin Files and Inject into MainApplication.kt
  config = withDangerousMod(config, 'android', async (config) => {
    const projectRoot = config.modRequest.projectRoot;
    const javaDir = path.join(
      projectRoot,
      'android/app/src/main/java/com/allver/app'
    );

    // Copy ringtone asset to native Android res/raw directory
    const rawDir = path.join(projectRoot, 'android/app/src/main/res/raw');
    fs.mkdirSync(rawDir, { recursive: true });
    const soundAssetPath = path.join(projectRoot, 'assets/sounds/ringtone.mp3');
    if (fs.existsSync(soundAssetPath)) {
      fs.copyFileSync(soundAssetPath, path.join(rawDir, 'ringtone.mp3'));
      console.log('[withIncomingCall] Copied ringtone.mp3 to android/app/src/main/res/raw/ringtone.mp3');
    }

    // I. Write IncomingCallActivity.kt
      const activityCode = `package com.allver.app

import android.app.Activity
import android.app.KeyguardManager
import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Color
import android.graphics.Typeface
import android.media.AudioAttributes
import android.media.Ringtone
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Vibrator
import android.view.Gravity
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

class IncomingCallActivity : Activity() {

    private var ringtone: Ringtone? = null
    private var vibrator: Vibrator? = null
    private var callId: String = ""
    private var callerName: String = ""

    private val dismissReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == "com.allver.app.ACTION_DISMISS_CALL") {
                cleanupAndFinish()
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 1. Get Intent Extras
        callId = intent.getStringExtra("callId") ?: ""
        callerName = intent.getStringExtra("callerName") ?: "Unknown Caller"

        // 2. Set Window Flags for Lock Screen Drawing
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
            val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
            keyguardManager.requestDismissKeyguard(this, null)
        } else {
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                or WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
                or WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            )
        }

        // 3. Register Dismiss Broadcast Receiver
        registerReceiver(dismissReceiver, IntentFilter("com.allver.app.ACTION_DISMISS_CALL"))

        // 4. Play Ringtone and Vibrate
        try {
            val soundResId = resources.getIdentifier("ringtone", "raw", packageName)
            val ringtoneUri = if (soundResId != 0) {
                Uri.parse("android.resource://" + packageName + "/" + soundResId)
            } else {
                RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
            }
            ringtone = RingtoneManager.getRingtone(applicationContext, ringtoneUri)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                ringtone?.audioAttributes = AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
            }
            ringtone?.play()
        } catch (e: Exception) {
            e.printStackTrace()
        }

        try {
            vibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            val pattern = longArrayOf(0, 1000, 1000)
            vibrator?.vibrate(pattern, 0) // Loop vibration
        } catch (e: Exception) {
            e.printStackTrace()
        }

        // 5. Build Programmatic UI
        val mainLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.parseColor("#0F172A")) // Dark Slate
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.MATCH_PARENT
            )
            setPadding(50, 100, 50, 100)
        }

        val titleView = TextView(this).apply {
            text = "INCOMING VOICE CALL"
            setTextColor(Color.parseColor("#94A3B8")) // Slate-400
            textSize = 14f
            typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 40)
        }
        mainLayout.addView(titleView)

        val callerNameView = TextView(this).apply {
            text = callerName
            setTextColor(Color.WHITE)
            textSize = 32f
            typeface = Typeface.create("sans-serif-bold", Typeface.BOLD)
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 150)
        }
        mainLayout.addView(callerNameView)

        // Accept / Decline Buttons Row
        val buttonRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                topMargin = 100
            }
        }

        val declineButton = Button(this).apply {
            text = "Decline"
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.parseColor("#EF4444")) // Red
            textSize = 16f
            typeface = Typeface.DEFAULT_BOLD
            setPadding(50, 30, 50, 30)
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                rightMargin = 40
            }
            setOnClickListener {
                handleDecline()
            }
        }
        buttonRow.addView(declineButton)

        val acceptButton = Button(this).apply {
            text = "Accept"
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.parseColor("#22C55E")) // Green
            textSize = 16f
            typeface = Typeface.DEFAULT_BOLD
            setPadding(50, 30, 50, 30)
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            setOnClickListener {
                handleAccept()
            }
        }
        buttonRow.addView(acceptButton)

        mainLayout.addView(buttonRow)
        setContentView(mainLayout)
    }

    private fun handleAccept() {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.cancel(1001)

        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            putExtra("action", "accept_call")
            putExtra("callId", callId)
            putExtra("callerName", callerName)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        if (launchIntent != null) {
            startActivity(launchIntent)
        }

        cleanupAndFinish()
    }

    private fun handleDecline() {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.cancel(1001)

        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            putExtra("action", "decline_call")
            putExtra("callId", callId)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        if (launchIntent != null) {
            startActivity(launchIntent)
        }

        cleanupAndFinish()
    }

    private fun cleanupAndFinish() {
        try {
            ringtone?.stop()
        } catch (e: Exception) {}
        try {
            vibrator?.cancel()
        } catch (e: Exception) {}
        try {
            unregisterReceiver(dismissReceiver)
        } catch (e: Exception) {}
        finish()
    }

    override fun onDestroy() {
        cleanupAndFinish()
        super.onDestroy()
    }
}`;
      fs.writeFileSync(path.join(javaDir, 'IncomingCallActivity.kt'), activityCode, 'utf8');
      console.log('[withIncomingCall] Wrote IncomingCallActivity.kt');

      // II. Write IncomingCallModule.kt
      const moduleCode = `package com.allver.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class IncomingCallModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "IncomingCallModule"
    }

    @ReactMethod
    fun showIncomingCall(callId: String, callerName: String) {
        val context = reactApplicationContext
        val intent = Intent(context, IncomingCallActivity::class.java).apply {
            putExtra("callId", callId)
            putExtra("callerName", callerName)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }

        val pendingIntentFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        val fullScreenPendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            pendingIntentFlags
        )

        val channelId = "allver_voice_calls"
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val soundResId = context.resources.getIdentifier("ringtone", "raw", context.packageName)
            val soundUri = if (soundResId != 0) {
                android.net.Uri.parse("android.resource://" + context.packageName + "/" + soundResId)
            } else {
                android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_RINGTONE)
            }
            val audioAttrs = android.media.AudioAttributes.Builder()
                .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(android.media.AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .build()

            val channel = NotificationChannel(
                channelId,
                "Incoming Voice Calls",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Channel for Allver voice call alerts"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 500, 250, 500)
                if (soundUri != null) {
                    setSound(soundUri, audioAttrs)
                }
            }
            notificationManager.createNotificationChannel(channel)
        }

        val builder = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(context.applicationInfo.icon)
            .setContentTitle("Incoming Voice Call")
            .setContentText("$callerName is calling you...")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .setAutoCancel(true)
            .setOngoing(true)

        notificationManager.notify(1001, builder.build())
    }

    @ReactMethod
    fun dismissIncomingCall() {
        val notificationManager = reactApplicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.cancel(1001)
        
        val intent = Intent("com.allver.app.ACTION_DISMISS_CALL")
        reactApplicationContext.sendBroadcast(intent)
    }
}`;
      fs.writeFileSync(path.join(javaDir, 'IncomingCallModule.kt'), moduleCode, 'utf8');
      console.log('[withIncomingCall] Wrote IncomingCallModule.kt');

      // III. Write IncomingCallPackage.kt
      const packageCode = `package com.allver.app

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class IncomingCallPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(IncomingCallModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}`;
      fs.writeFileSync(path.join(javaDir, 'IncomingCallPackage.kt'), packageCode, 'utf8');
      console.log('[withIncomingCall] Wrote IncomingCallPackage.kt');

      // IV. Inject Package into MainApplication.kt
      const appFile = path.join(javaDir, 'MainApplication.kt');
      if (fs.existsSync(appFile)) {
        let appContent = fs.readFileSync(appFile, 'utf8');
        
        if (!appContent.includes('add(IncomingCallPackage())')) {
          // Find PackageList invocation
          const target = 'PackageList(this).packages.apply {';
          const replacement = `PackageList(this).packages.apply {\n              add(IncomingCallPackage())`;
          
          if (appContent.includes(target)) {
            appContent = appContent.replace(target, replacement);
            fs.writeFileSync(appFile, appContent, 'utf8');
            console.log('[withIncomingCall] Injected IncomingCallPackage into MainApplication.kt');
          }
        }
      }
  });

  return config;
};
