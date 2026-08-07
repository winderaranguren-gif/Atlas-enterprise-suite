package com.atlas.navigation

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Bundle
import android.provider.Settings
import android.view.WindowManager
import androidx.core.app.ActivityCompat
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission

@CapacitorPlugin(
    name = "AtlasNavigation",
    permissions = [
        Permission(
            alias = "location",
            strings = [
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            ]
        )
    ]
)
class AtlasNavigationPlugin : Plugin(), LocationListener {
    private lateinit var locationManager: LocationManager
    private var navigationActive = false
    private var routeId: String? = null
    private var destinationName: String? = null

    override fun load() {
        locationManager = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
    }

    @PluginMethod
    fun startBackgroundNavigation(call: PluginCall) {
        if (!locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
            call.reject("Location services are disabled")
            return
        }
        if (ActivityCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            requestPermissionForAlias("location", call, "locationPermissionCallback")
            return
        }
        beginNavigation(call)
    }

    @com.getcapacitor.annotation.PermissionCallback
    private fun locationPermissionCallback(call: PluginCall) {
        if (getPermissionState("location") != com.getcapacitor.PermissionState.GRANTED) {
            call.reject("Location permission was not granted")
            return
        }
        beginNavigation(call)
    }

    private fun beginNavigation(call: PluginCall) {
        routeId = call.getString("routeId")
        destinationName = call.getString("destinationName")
        navigationActive = true
        activity.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        if (ActivityCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
            locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 1000L, 0f, this)
        }

        val serviceIntent = Intent(context, AtlasNavigationService::class.java).apply {
            putExtra("routeId", routeId)
            putExtra("destinationName", destinationName)
        }
        androidx.core.content.ContextCompat.startForegroundService(context, serviceIntent)

        call.resolve(JSObject().put("active", true).put("routeId", routeId).put("destinationName", destinationName))
    }

    @PluginMethod
    fun updateGuidance(call: PluginCall) {
        if (!navigationActive) {
            call.reject("Navigation is not active")
            return
        }
        val instruction = call.getString("instruction", "Continue")
        val distanceMeters = call.getDouble("distanceMeters", 0.0)
        val etaEpochMs = call.getDouble("etaEpochMs", 0.0)

        val serviceIntent = Intent(context, AtlasNavigationService::class.java).apply {
            action = AtlasNavigationService.ACTION_UPDATE_GUIDANCE
            putExtra("instruction", instruction)
            putExtra("distanceMeters", distanceMeters)
            putExtra("etaEpochMs", etaEpochMs)
        }
        context.startService(serviceIntent)
        notifyListeners("guidanceUpdated", JSObject().put("instruction", instruction).put("distanceMeters", distanceMeters).put("etaEpochMs", etaEpochMs))
        call.resolve(JSObject().put("updated", true))
    }

    @PluginMethod
    fun stopBackgroundNavigation(call: PluginCall) {
        navigationActive = false
        locationManager.removeUpdates(this)
        activity.window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        context.stopService(Intent(context, AtlasNavigationService::class.java))
        routeId = null
        destinationName = null
        call.resolve(JSObject().put("active", false))
    }

    @PluginMethod
    fun getNavigationStatus(call: PluginCall) {
        val locationEnabled = locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)
        call.resolve(
            JSObject()
                .put("active", navigationActive)
                .put("locationEnabled", locationEnabled)
                .put("routeId", routeId)
                .put("destinationName", destinationName)
        )
    }

    @PluginMethod
    fun purgeLocalNavigationData(call: PluginCall) {
        context.getSharedPreferences("atlas_navigation", Context.MODE_PRIVATE).edit().clear().apply()
        routeId = null
        destinationName = null
        call.resolve(JSObject().put("purged", true))
    }

    override fun onLocationChanged(location: Location) {
        if (!navigationActive) return
        notifyListeners(
            "locationUpdate",
            JSObject()
                .put("latitude", location.latitude)
                .put("longitude", location.longitude)
                .put("altitude", location.altitude)
                .put("accuracy", location.accuracy)
                .put("speed", location.speed)
                .put("course", location.bearing)
                .put("timestamp", location.time)
        )
    }

    override fun onProviderEnabled(provider: String) = Unit
    override fun onProviderDisabled(provider: String) {
        notifyListeners("navigationError", JSObject().put("message", "Location provider disabled"))
    }
    override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) = Unit
}
