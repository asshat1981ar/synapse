package com.synapse.app.ui.projects

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.synapse.app.domain.model.ProjectSummary
import com.synapse.app.ui.common.EmptyState
import com.synapse.app.ui.common.ErrorState
import com.synapse.app.ui.common.LoadingScreen

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProjectsScreen(
    onNavigateToProject: (String) -> Unit,
    onNavigateToAI: (String) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: ProjectsViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var showCreateDialog by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { 
                    Text(
                        "Projects",
                        fontWeight = FontWeight.Medium
                    ) 
                },
                actions = {
                    IconButton(onClick = { /* TODO: Implement search */ }) {
                        Icon(Icons.Default.Search, contentDescription = "Search")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showCreateDialog = true }
            ) {
                Icon(Icons.Default.Add, contentDescription = "Create Project")
            }
        },
        modifier = modifier
    ) { innerPadding ->
        when (val state = uiState) {
            is ProjectsUiState.Loading -> {
                LoadingScreen(
                    modifier = Modifier.padding(innerPadding)
                )
            }
            
            is ProjectsUiState.Success -> {
                if (state.projects.isEmpty()) {
                    EmptyState(
                        title = "No projects yet",
                        subtitle = "Create your first AI-powered project to get started",
                        action = {
                            Button(onClick = { showCreateDialog = true }) {
                                Text("Create Project")
                            }
                        },
                        modifier = Modifier.padding(innerPadding)
                    )
                } else {
                    ProjectsList(
                        projects = state.projects,
                        onProjectClick = onNavigateToProject,
                        onAIClick = onNavigateToAI,
                        modifier = Modifier.padding(innerPadding)
                    )
                }
            }
            
            is ProjectsUiState.Error -> {
                ErrorState(
                    title = "Failed to load projects",
                    subtitle = state.message,
                    onRetry = viewModel::loadProjects,
                    modifier = Modifier.padding(innerPadding)
                )
            }
        }
    }

    if (showCreateDialog) {
        CreateProjectDialog(
            onDismiss = { showCreateDialog = false },
            onCreateProject = { name, type, description ->
                viewModel.createProject(name, type, description)
                showCreateDialog = false
            }
        )
    }
}

@Composable
fun ProjectsList(
    projects: List<ProjectSummary>,
    onProjectClick: (String) -> Unit,
    onAIClick: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items(projects) { project ->
            ProjectCard(
                project = project,
                onClick = { onProjectClick(project.id) },
                onAIClick = { onAIClick(project.id) }
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProjectCard(
    project: ProjectSummary,
    onClick: () -> Unit,
    onAIClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        onClick = onClick,
        modifier = modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = project.name,
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Medium
                    )
                    
                    if (project.description?.isNotBlank() == true) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = project.description,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
                
                ProjectTypeChip(projectType = project.projectType.name)
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "${project.fileCount} files",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    
                    if (project.collaboratorCount > 0) {
                        Text(
                            text = "${project.collaboratorCount} collaborators",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
                
                OutlinedButton(
                    onClick = onAIClick,
                    modifier = Modifier.height(32.dp)
                ) {
                    Text("AI Chat", style = MaterialTheme.typography.labelSmall)
                }
            }
        }
    }
}

@Composable
fun ProjectTypeChip(
    projectType: String,
    modifier: Modifier = Modifier
) {
    val displayName = when (projectType.uppercase()) {
        "ANDROID_APP" -> "Android"
        "WEB_APP" -> "Web App"
        "API" -> "API"
        "SCRIPT" -> "Script"
        "DOCUMENT" -> "Document"
        else -> projectType
    }
    
    AssistChip(
        onClick = { },
        label = { 
            Text(
                displayName,
                style = MaterialTheme.typography.labelSmall
            ) 
        },
        modifier = modifier
    )
}

@Composable
fun CreateProjectDialog(
    onDismiss: () -> Unit,
    onCreateProject: (String, String, String) -> Unit
) {
    var name by remember { mutableStateOf("") }
    var selectedType by remember { mutableStateOf("ANDROID_APP") }
    var description by remember { mutableStateOf("") }
    var expanded by remember { mutableStateOf(false) }

    val projectTypes = listOf(
        "ANDROID_APP" to "Android App",
        "WEB_APP" to "Web Application",
        "API" to "REST API",
        "SCRIPT" to "Script/Automation",
        "DOCUMENT" to "Documentation"
    )

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Create New Project") },
        text = {
            Column(
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Project Name") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                ExposedDropdownMenuBox(
                    expanded = expanded,
                    onExpandedChange = { expanded = !expanded }
                ) {
                    OutlinedTextField(
                        value = projectTypes.find { it.first == selectedType }?.second ?: "",
                        onValueChange = { },
                        readOnly = true,
                        label = { Text("Project Type") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                        modifier = Modifier
                            .menuAnchor()
                            .fillMaxWidth()
                    )
                    
                    ExposedDropdownMenu(
                        expanded = expanded,
                        onDismissRequest = { expanded = false }
                    ) {
                        projectTypes.forEach { (value, display) ->
                            DropdownMenuItem(
                                text = { Text(display) },
                                onClick = {
                                    selectedType = value
                                    expanded = false
                                }
                            )
                        }
                    }
                }

                OutlinedTextField(
                    value = description,
                    onValueChange = { description = it },
                    label = { Text("Description (Optional)") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 2,
                    maxLines = 4
                )
            }
        },
        confirmButton = {
            TextButton(
                onClick = { onCreateProject(name, selectedType, description) },
                enabled = name.isNotBlank()
            ) {
                Text("Create")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}