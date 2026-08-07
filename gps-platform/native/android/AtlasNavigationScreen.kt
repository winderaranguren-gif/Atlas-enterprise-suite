package com.atlas.navigation

import androidx.car.app.CarContext
import androidx.car.app.Screen
import androidx.car.app.model.Action
import androidx.car.app.model.ActionStrip
import androidx.car.app.model.CarIcon
import androidx.car.app.model.Distance
import androidx.car.app.model.Maneuver
import androidx.car.app.model.Template
import androidx.car.app.model.TravelEstimate
import androidx.car.app.navigation.model.NavigationTemplate
import androidx.car.app.navigation.model.RoutingInfo
import androidx.car.app.navigation.model.Step
import androidx.core.graphics.drawable.IconCompat
import java.time.DateTimeException
import java.time.ZonedDateTime

class AtlasNavigationScreen(carContext: CarContext) : Screen(carContext) {
    private var destinationName: String = "ATLAS destination"
    private var instruction: String = "Select a destination on the phone"
    private var distanceMeters: Double = 0.0
    private var durationSeconds: Double = 0.0

    fun updateGuidance(
        destinationName: String?,
        instruction: String?,
        distanceMeters: Double,
        durationSeconds: Double
    ) {
        if (!destinationName.isNullOrBlank()) this.destinationName = destinationName
        if (!instruction.isNullOrBlank()) this.instruction = instruction
        this.distanceMeters = distanceMeters.coerceAtLeast(0.0)
        this.durationSeconds = durationSeconds.coerceAtLeast(0.0)
        invalidate()
    }

    override fun onGetTemplate(): Template {
        val maneuver = Maneuver.Builder(Maneuver.TYPE_STRAIGHT).build()
        val step = Step.Builder(instruction)
            .setManeuver(maneuver)
            .setCue(CarIcon.Builder(IconCompat.createWithResource(carContext, android.R.drawable.arrow_up_float)).build())
            .build()
        val remainingDistance = Distance.create(distanceMeters.coerceAtLeast(1.0), Distance.UNIT_METERS)
        val routingInfo = RoutingInfo.Builder()
            .setCurrentStep(step, remainingDistance)
            .build()
        val arrival = try {
            ZonedDateTime.now().plusSeconds(durationSeconds.toLong().coerceAtLeast(0))
        } catch (_: DateTimeException) {
            ZonedDateTime.now()
        }
        val estimate = TravelEstimate.Builder(remainingDistance, arrival)
            .setRemainingTimeSeconds(durationSeconds.toLong().coerceAtLeast(0))
            .build()
        val actions = ActionStrip.Builder()
            .addAction(Action.PAN)
            .addAction(
                Action.Builder()
                    .setTitle("STOP")
                    .setOnClickListener {
                        updateGuidance("ATLAS", "Navigation stopped", 0.0, 0.0)
                    }
                    .build()
            )
            .build()

        return NavigationTemplate.Builder()
            .setNavigationInfo(routingInfo)
            .setDestinationTravelEstimate(estimate)
            .setActionStrip(actions)
            .setBackgroundColor(androidx.car.app.model.CarColor.BLUE)
            .build()
    }
}
