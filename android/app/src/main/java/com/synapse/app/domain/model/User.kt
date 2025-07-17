package com.synapse.app.domain.model

import android.os.Parcelable
import kotlinx.parcelize.Parcelize

@Parcelize
data class User(
    val id: String,
    val email: String,
    val displayName: String,
    val createdAt: String,
    val preferences: UserPreferences
) : Parcelable

@Parcelize
data class UserPreferences(
    val theme: String = "light",
    val defaultModels: List<String> = emptyList(),
    val autoSaveInterval: Int = 30000
) : Parcelable

@Parcelize
data class AuthTokens(
    val accessToken: String,
    val refreshToken: String
) : Parcelable