package com.atlas.navigation

import android.content.Intent
import androidx.car.app.Screen
import androidx.car.app.Session

class AtlasCarSession : Session() {
    private lateinit var navigationScreen: AtlasNavigationScreen

    override fun onCreateScreen(intent: Intent): Screen {
        navigationScreen = AtlasNavigationScreen(carContext)
        applyIntent(intent)
        return navigationScreen
    }

    override fun onNewIntent(intent: Intent) {
        applyIntent(intent)
    }

    private fun applyIntent(intent: Intent) {
        if (!::navigationScreen.isInitialized) return
        val destinationName = intent.getStringExtra("destinationName")
        val instruction = intent.getStringExtra("instruction")
        val distanceMeters = intent.getDoubleExtra("distanceMeters", 0.0)
        val durationSeconds = intent.getDoubleExtra("durationSeconds", 0.0)
        navigationScreen.updateGuidance(
            destinationName = destinationName,
            instruction = instruction,
            distanceMeters = distanceMeters,
            durationSeconds = durationSeconds
        )
    }
}
