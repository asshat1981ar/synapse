package com.synapse.app.domain.model

import android.os.Parcelable
import kotlinx.parcelize.Parcelize

@Parcelize
data class Project(
    val id: String,
    val name: String,
    val description: String?,
    val projectType: ProjectType,
    val ownerId: String,
    val collaborators: List<String>,
    val configuration: ProjectConfiguration,
    val createdAt: String,
    val updatedAt: String
) : Parcelable

@Parcelize
enum class ProjectType : Parcelable {
    ANDROID_APP,
    WEB_APP,
    API,
    SCRIPT,
    DOCUMENT
}

@Parcelize
data class ProjectConfiguration(
    val targetSdk: Int? = null,
    val minSdk: Int? = null,
    val language: String? = null,
    val framework: String? = null,
    val uiFramework: String? = null,
    val aiAgents: List<String> = emptyList()
) : Parcelable

@Parcelize
data class ProjectFile(
    val id: String,
    val projectId: String,
    val filePath: String,
    val content: String,
    val language: String?,
    val createdAt: String,
    val modifiedAt: String,
    val modifiedBy: String
) : Parcelable

@Parcelize
data class ProjectSummary(
    val id: String,
    val name: String,
    val description: String?,
    val projectType: ProjectType,
    val createdAt: String,
    val updatedAt: String,
    val fileCount: Int = 0,
    val collaboratorCount: Int = 0
) : Parcelable