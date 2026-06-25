package dev.myexercise.app

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "TimerAudioFocus")
class TimerAudioFocusPlugin : Plugin() {
  private var audioManager: AudioManager? = null
  private var focusRequest: AudioFocusRequest? = null

  @PluginMethod
  fun beginDuck(call: PluginCall) {
    val am = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    audioManager = am

    val granted =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val attrs =
          AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        val request =
          AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
            .setAudioAttributes(attrs)
            .setWillPauseWhenDucked(false)
            .build()
        focusRequest = request
        am.requestAudioFocus(request) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
      } else {
        @Suppress("DEPRECATION")
        am.requestAudioFocus(
          null,
          AudioManager.STREAM_MUSIC,
          AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK,
        ) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
      }

    call.resolve(JSObject().put("granted", granted))
  }

  @PluginMethod
  fun endDuck(call: PluginCall) {
    val am =
      audioManager ?: context.getSystemService(Context.AUDIO_SERVICE) as AudioManager

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      focusRequest?.let { am.abandonAudioFocusRequest(it) }
    } else {
      @Suppress("DEPRECATION")
      am.abandonAudioFocus(null)
    }

    focusRequest = null
    audioManager = null
    call.resolve()
  }
}
