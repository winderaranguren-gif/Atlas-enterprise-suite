package com.atlas.navigation

import androidx.car.app.CarAppService
import androidx.car.app.Session
import androidx.car.app.SessionInfo
import androidx.car.app.validation.HostValidator

class AtlasCarAppService : CarAppService() {
    override fun createHostValidator(): HostValidator {
        if (BuildConfig.DEBUG) return HostValidator.ALLOW_ALL_HOSTS_VALIDATOR
        return HostValidator.Builder(applicationContext)
            .addAllowedHosts(R.array.atlas_allowed_car_hosts)
            .build()
    }

    override fun onCreateSession(sessionInfo: SessionInfo): Session = AtlasCarSession()
}
