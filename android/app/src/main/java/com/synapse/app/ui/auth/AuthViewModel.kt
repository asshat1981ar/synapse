package com.synapse.app.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.synapse.app.data.api.SynapseApiService
import com.synapse.app.data.api.dto.LoginRequest
import com.synapse.app.data.api.dto.RegisterRequest
import com.synapse.app.data.local.AuthTokenManager
import com.synapse.app.ui.AuthState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val apiService: SynapseApiService,
    private val tokenManager: AuthTokenManager
) : ViewModel() {

    private val _authState = MutableStateFlow<AuthState>(AuthState.Loading)
    val authState: StateFlow<AuthState> = _authState.asStateFlow()

    private val _loginState = MutableStateFlow<LoginState>(LoginState.Idle)
    val loginState: StateFlow<LoginState> = _loginState.asStateFlow()

    private val _registerState = MutableStateFlow<RegisterState>(RegisterState.Idle)
    val registerState: StateFlow<RegisterState> = _registerState.asStateFlow()

    init {
        checkAuthState()
    }

    fun checkAuthState() {
        viewModelScope.launch {
            _authState.value = AuthState.Loading
            
            if (tokenManager.hasValidTokens()) {
                try {
                    val response = apiService.getProfile()
                    if (response.isSuccessful && response.body()?.success == true) {
                        _authState.value = AuthState.Authenticated
                    } else {
                        // Invalid tokens, clear them
                        tokenManager.clearTokens()
                        _authState.value = AuthState.Unauthenticated
                    }
                } catch (e: Exception) {
                    // Network error, assume tokens are still valid for offline usage
                    _authState.value = AuthState.Authenticated
                }
            } else {
                _authState.value = AuthState.Unauthenticated
            }
        }
    }

    fun login(email: String, password: String) {
        viewModelScope.launch {
            _loginState.value = LoginState.Loading
            
            try {
                val response = apiService.login(LoginRequest(email, password))
                
                if (response.isSuccessful) {
                    val body = response.body()
                    if (body?.success == true && body.data != null) {
                        // Save tokens
                        tokenManager.saveTokens(
                            body.data.accessToken,
                            body.data.refreshToken
                        )
                        
                        _loginState.value = LoginState.Success
                        _authState.value = AuthState.Authenticated
                    } else {
                        _loginState.value = LoginState.Error(
                            body?.error ?: "Login failed"
                        )
                    }
                } else {
                    _loginState.value = LoginState.Error(
                        "Login failed: ${response.code()}"
                    )
                }
            } catch (e: Exception) {
                _loginState.value = LoginState.Error(
                    e.message ?: "Network error"
                )
            }
        }
    }

    fun register(email: String, password: String, displayName: String) {
        viewModelScope.launch {
            _registerState.value = RegisterState.Loading
            
            try {
                val response = apiService.register(
                    RegisterRequest(email, password, displayName)
                )
                
                if (response.isSuccessful) {
                    val body = response.body()
                    if (body?.success == true && body.data != null) {
                        // Save tokens
                        tokenManager.saveTokens(
                            body.data.accessToken,
                            body.data.refreshToken
                        )
                        
                        _registerState.value = RegisterState.Success
                        _authState.value = AuthState.Authenticated
                    } else {
                        _registerState.value = RegisterState.Error(
                            body?.error ?: "Registration failed"
                        )
                    }
                } else {
                    _registerState.value = RegisterState.Error(
                        "Registration failed: ${response.code()}"
                    )
                }
            } catch (e: Exception) {
                _registerState.value = RegisterState.Error(
                    e.message ?: "Network error"
                )
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            try {
                val refreshToken = tokenManager.getRefreshToken()
                if (refreshToken != null) {
                    // Attempt to logout on server (fire and forget)
                    try {
                        apiService.logout(com.synapse.app.data.api.dto.RefreshTokenRequest(refreshToken))
                    } catch (e: Exception) {
                        // Ignore server logout errors
                    }
                }
            } finally {
                // Always clear local tokens
                tokenManager.clearTokens()
                _authState.value = AuthState.Unauthenticated
                _loginState.value = LoginState.Idle
                _registerState.value = RegisterState.Idle
            }
        }
    }

    fun clearLoginState() {
        _loginState.value = LoginState.Idle
    }

    fun clearRegisterState() {
        _registerState.value = RegisterState.Idle
    }
}

sealed class LoginState {
    object Idle : LoginState()
    object Loading : LoginState()
    object Success : LoginState()
    data class Error(val message: String) : LoginState()
}

sealed class RegisterState {
    object Idle : RegisterState()
    object Loading : RegisterState()
    object Success : RegisterState()
    data class Error(val message: String) : RegisterState()
}