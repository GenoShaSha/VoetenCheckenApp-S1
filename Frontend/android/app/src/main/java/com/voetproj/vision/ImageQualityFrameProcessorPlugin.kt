package com.voetproj.vision

import android.graphics.ImageFormat
import android.media.Image
import com.mrousavy.camera.frameprocessors.Frame
import com.mrousavy.camera.frameprocessors.FrameProcessorPlugin
import com.mrousavy.camera.frameprocessors.VisionCameraProxy
import kotlin.math.max
import kotlin.math.sqrt

class ImageQualityFrameProcessorPlugin(proxy: VisionCameraProxy, options: Map<String, Any>?) : FrameProcessorPlugin() {
  override fun callback(frame: Frame, arguments: Map<String, Any>?): Any? {
    val image = frame.image
    if (image.format != ImageFormat.YUV_420_888) {
      return null
    }

    val yPlane = image.planes[0]
    val buffer = yPlane.buffer
    val data = ByteArray(buffer.remaining())
    buffer.get(data)

    val width = image.width
    val height = image.height
    val rowStride = yPlane.rowStride
    val pixelStride = yPlane.pixelStride
    
    var sum = 0.0
    var sumSq = 0.0
    var count = 0
    val step = 8

    for (y in 0 until height step step) {
      val rowStart = y * rowStride
      for (x in 0 until width step step) {
        val idx = rowStart + x * pixelStride
        if (idx < data.size) {
          val v = data[idx].toInt() and 0xFF
          sum += v
          sumSq += v * v
          count++
        }
      }
    }

    if (count == 0) return null

    val mean = sum / count
    val variance = sumSq / count - mean * mean
    val stdDev = sqrt(max(variance, 0.0))

    val isTooDark = mean < 60
    val isTooBright = mean > 200
    val isBlurry = stdDev < 20 

    return mapOf(
      "brightness" to mean,
      "stdDev" to stdDev,
      "isTooDark" to isTooDark,
      "isTooBright" to isTooBright,
      "isBlurry" to isBlurry
    )
  }
}
