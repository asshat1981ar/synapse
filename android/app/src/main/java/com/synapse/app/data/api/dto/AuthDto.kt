package com.synapse.app.data.api.dto

import com.google.gson.annotations.SerializedName

data class RegisterRequest(
    @SerializedName("email")
    val email: String,
    @SerializedName("password")
    val password: String,
    @SerializedName("displayName")
    val displayName: String
)

data class LoginRequest(
    @SerializedName("email")
    val email: String,
    @SerializedName("password")
    val password: String
)

data class RefreshTokenRequest(
    @SerializedName("refreshToken")
    val refreshToken: String
)

data class AuthResponse(
    @SerializedName("user")
    val user: UserDto,
    @SerializedName("accessToken")
    val accessToken: String,
    @SerializedName("refreshToken")
    val refreshToken: String
)

data class TokenResponse(
    @SerializedName("accessToken")
    val accessToken: String,
    @SerializedName("refreshToken")
    val refreshToken: String
)

data class UserDto(
    @SerializedName("id")
    val id: String,
    @SerializedName("email")
    val email: String,
    @SerializedName("displayName")
    val displayName: String,
    @SerializedName("createdAt")
    val createdAt: String,
    @SerializedName("preferences")
    val preferences: UserPreferencesDto
)

data class UserPreferencesDto(
    @SerializedName("theme")
    val theme: String = "light",
    @SerializedName("defaultModels")
    val defaultModels: List<String> = emptyList(),
    @SerializedName("autoSaveInterval")
    val autoSaveInterval: Int = 30000
)