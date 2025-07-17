package com.synapse.app.ui.projects

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.synapse.app.data.api.SynapseApiService
import com.synapse.app.data.api.dto.CreateProjectRequest
import com.synapse.app.domain.model.ProjectSummary
import com.synapse.app.domain.model.ProjectType
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ProjectsViewModel @Inject constructor(
    private val apiService: SynapseApiService
) : ViewModel() {

    private val _uiState = MutableStateFlow<ProjectsUiState>(ProjectsUiState.Loading)
    val uiState: StateFlow<ProjectsUiState> = _uiState.asStateFlow()

    init {
        loadProjects()
    }

    fun loadProjects() {
        viewModelScope.launch {
            _uiState.value = ProjectsUiState.Loading
            
            try {
                val response = apiService.getProjects()
                
                if (response.isSuccessful) {
                    val body = response.body()
                    if (body?.success == true && body.data != null) {
                        val projects = body.data.data.map { dto ->
                            ProjectSummary(
                                id = dto.id,
                                name = dto.name,
                                description = dto.description,
                                projectType = ProjectType.valueOf(dto.projectType.uppercase()),
                                createdAt = dto.createdAt,
                                updatedAt = dto.updatedAt,
                                fileCount = 0, // TODO: Get from API when available
                                collaboratorCount = dto.collaborators.size
                            )
                        }
                        _uiState.value = ProjectsUiState.Success(projects)
                    } else {
                        _uiState.value = ProjectsUiState.Error(
                            body?.error ?: "Failed to load projects"
                        )
                    }
                } else {
                    _uiState.value = ProjectsUiState.Error(
                        "Failed to load projects: ${response.code()}"
                    )
                }
            } catch (e: Exception) {
                _uiState.value = ProjectsUiState.Error(
                    e.message ?: "Network error"
                )
            }
        }
    }

    fun createProject(name: String, type: String, description: String) {
        viewModelScope.launch {
            try {
                val request = CreateProjectRequest(
                    name = name,
                    projectType = type.lowercase(),
                    description = description.ifBlank { null }
                )
                
                val response = apiService.createProject(request)
                
                if (response.isSuccessful) {
                    val body = response.body()
                    if (body?.success == true) {
                        // Reload projects to include the new one
                        loadProjects()
                    } else {
                        // Handle creation error
                        // TODO: Show error message to user
                    }
                } else {
                    // Handle HTTP error
                    // TODO: Show error message to user
                }
            } catch (e: Exception) {
                // Handle network error
                // TODO: Show error message to user
            }
        }
    }

    fun deleteProject(projectId: String) {
        viewModelScope.launch {
            try {
                val response = apiService.deleteProject(projectId)
                
                if (response.isSuccessful) {
                    // Reload projects to reflect the deletion
                    loadProjects()
                } else {
                    // Handle deletion error
                    // TODO: Show error message to user
                }
            } catch (e: Exception) {
                // Handle network error
                // TODO: Show error message to user
            }
        }
    }
}

sealed class ProjectsUiState {
    object Loading : ProjectsUiState()
    data class Success(val projects: List<ProjectSummary>) : ProjectsUiState()
    data class Error(val message: String) : ProjectsUiState()
}