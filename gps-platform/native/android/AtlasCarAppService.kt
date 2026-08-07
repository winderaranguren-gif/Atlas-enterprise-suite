package com.atlas.navigation

import androidx.car.app.CarAppService
import androidx.car.app.Session
import androidx.car.app.SessionInfo
import androidx.car.app.validation.HostValidator

class AtlasCarAppService : CarAppService() {
    override fun createHostValidator(): HostValidator =
        HostValidator.Builder(applicationContext)
            .addAllowedHosts(androidx.car.app.R.array.hosts_allowlist_sample)
            .build()

    override fun onCreateSession(sessionInfo: SessionInfo): Session = AtlasCarSession()
}
