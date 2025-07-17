package com.synapse.app.data.api.dto

import com.google.gson.annotations.SerializedName

data class CreateProjectRequest(
    @SerializedName("name")
    val name: String,
    @SerializedName("projectType")
    val projectType: String,
    @SerializedName("description")
    val description: String? = null,
    @SerializedName("templateId")
    val templateId: String? = null
)

data class UpdateProjectRequest(
    @SerializedName("name")
    val name: String? = null,
    @SerializedName("description")
    val description: String? = null,
    @SerializedName("configuration")
    val configuration: Map<String, Any>? = null
)

data class UpdateProfileRequest(
    @SerializedName("displayName")
    val displayName: String? = null,
    @SerializedName("preferences")
    val preferences: Map<String, Any>? = null
)

data class ProjectDto(
    @SerializedName("id")
    val id: String,
    @SerializedName("name")
    val name: String,
    @SerializedName("description")
    val description: String?,
    @SerializedName("projectType")
    val projectType: String,
    @SerializedName("ownerId")
    val ownerId: String,
    @SerializedName("collaborators")
    val collaborators: List<String>,
    @SerializedName("configuration")
    val configuration: Map<String, Any>,
    @SerializedName("createdAt")
    val createdAt: String,
    @SerializedName("updatedAt")
    val updatedAt: String
)

data class ProjectDetailDto(
    @SerializedName("id")
    val id: String,
    @SerializedName("name")
    val name: String,
    @SerializedName("description")
    val description: String?,
    @SerializedName("projectType")
    val projectType: String,
    @SerializedName("ownerId")
    val ownerId: String,
    @SerializedName("collaborators")
    val collaborators: List<String>,
    @SerializedName("configuration")
    val configuration: Map<String, Any>,
    @SerializedName("createdAt")
    val createdAt: String,
    @SerializedName("updatedAt")
    val updatedAt: String,
    @SerializedName("files")
    val files: List<ProjectFileDto>
)

data class ProjectFileDto(
    @SerializedName("id")
    val id: String,
    @SerializedName("projectId")
    val projectId: String,
    @SerializedName("filePath")
    val filePath: String,
    @SerializedName("content")
    val content: String,
    @SerializedName("language")
    val language: String?,
    @SerializedName("createdAt")
    val createdAt: String,
    @SerializedName("modifiedAt")
    val modifiedAt: String,
    @SerializedName("modifiedBy")
    val modifiedBy: String
)

data class CreateFileRequest(
    @SerializedName("filePath")
    val filePath: String,
    @SerializedName("content")
    val content: String = "",
    @SerializedName("language")
    val language: String? = null
)

data class UpdateFileRequest(
    @SerializedName("content")
    val content: String? = null,
    @SerializedName("language")
    val language: String? = null
)