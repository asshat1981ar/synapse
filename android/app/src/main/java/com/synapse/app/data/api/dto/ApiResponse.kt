package com.synapse.app.data.api.dto

import com.google.gson.annotations.SerializedName

data class ApiResponse<T>(
    @SerializedName("success")
    val success: Boolean,
    @SerializedName("data")
    val data: T? = null,
    @SerializedName("error")
    val error: String? = null,
    @SerializedName("details")
    val details: List<ValidationError>? = null
)

data class ValidationError(
    @SerializedName("type")
    val type: String,
    @SerializedName("value")
    val value: String,
    @SerializedName("msg")
    val message: String,
    @SerializedName("path")
    val path: String,
    @SerializedName("location")
    val location: String
)

data class PaginatedResponse<T>(
    @SerializedName("data")
    val data: List<T>,
    @SerializedName("pagination")
    val pagination: Pagination
)

data class Pagination(
    @SerializedName("total")
    val total: Int,
    @SerializedName("limit")
    val limit: Int,
    @SerializedName("offset")
    val offset: Int,
    @SerializedName("hasMore")
    val hasMore: Boolean
)