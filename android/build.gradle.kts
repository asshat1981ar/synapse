// Top-level build file where you can add configuration options common to all sub-projects/modules.
buildscript {
    val composeVersion by extra("1.5.8")
    val kotlinVersion by extra("1.9.22")
}

plugins {
    id("com.android.application") version "8.2.2" apply false
    id("org.jetbrains.kotlin.android") version "1.9.22" apply false
    id("com.google.dagger.hilt.android") version "2.48.1" apply false
    id("kotlin-parcelize") apply false
}

tasks.register("clean", Delete::class) {
    delete(rootProject.buildDir)
}