package com.synapse.app.ui

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.synapse.app.ui.auth.AuthScreen
import com.synapse.app.ui.auth.AuthViewModel
import com.synapse.app.ui.common.LoadingScreen
import com.synapse.app.ui.projects.ProjectsScreen

@Composable
fun SynapseApp(
    navController: NavHostController = rememberNavController(),
    authViewModel: AuthViewModel = hiltViewModel()
) {
    val authState by authViewModel.authState.collectAsState()

    Scaffold { innerPadding ->
        when (authState) {
            is AuthState.Loading -> {
                LoadingScreen()
            }
            
            is AuthState.Authenticated -> {
                MainNavigation(
                    navController = navController,
                    modifier = Modifier.padding(innerPadding)
                )
            }
            
            is AuthState.Unauthenticated -> {
                AuthScreen(
                    onAuthSuccess = {
                        authViewModel.checkAuthState()
                    },
                    modifier = Modifier.padding(innerPadding)
                )
            }
        }
    }
}

@Composable
fun MainNavigation(
    navController: NavHostController,
    modifier: Modifier = Modifier
) {
    NavHost(
        navController = navController,
        startDestination = "projects",
        modifier = modifier
    ) {
        composable("projects") {
            ProjectsScreen(
                onNavigateToProject = { projectId ->
                    navController.navigate("project/$projectId")
                },
                onNavigateToAI = { projectId ->
                    navController.navigate("ai/$projectId")
                }
            )
        }
        
        composable("project/{projectId}") { backStackEntry ->
            val projectId = backStackEntry.arguments?.getString("projectId") ?: ""
            ProjectDetailScreen(
                projectId = projectId,
                onNavigateBack = { navController.popBackStack() },
                onNavigateToAI = { navController.navigate("ai/$projectId") }
            )
        }
        
        composable("ai/{projectId}") { backStackEntry ->
            val projectId = backStackEntry.arguments?.getString("projectId") ?: ""
            AIScreen(
                projectId = projectId,
                onNavigateBack = { navController.popBackStack() }
            )
        }
        
        composable("profile") {
            ProfileScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }
    }
}

// Placeholder composables - to be implemented
@Composable
fun ProjectDetailScreen(
    projectId: String,
    onNavigateBack: () -> Unit,
    onNavigateToAI: () -> Unit
) {
    // TODO: Implement project detail screen
}

@Composable
fun AIScreen(
    projectId: String,
    onNavigateBack: () -> Unit
) {
    // TODO: Implement AI chat screen
}

@Composable
fun ProfileScreen(
    onNavigateBack: () -> Unit
) {
    // TODO: Implement profile screen
}

sealed class AuthState {
    object Loading : AuthState()
    object Authenticated : AuthState()
    object Unauthenticated : AuthState()
}