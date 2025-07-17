package com.synapse.app

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class SynapseApplication : Application() {
    
    override fun onCreate() {
        super.onCreate()
    }
}