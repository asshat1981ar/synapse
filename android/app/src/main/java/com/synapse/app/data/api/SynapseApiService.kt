package com.synapse.app.data.api

import com.synapse.app.data.api.dto.*
import retrofit2.Response
import retrofit2.http.*

interface SynapseApiService {
    
    // Authentication endpoints
    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<ApiResponse<AuthResponse>>
    
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<ApiResponse<AuthResponse>>
    
    @POST("auth/refresh")
    suspend fun refreshToken(@Body request: RefreshTokenRequest): Response<ApiResponse<TokenResponse>>
    
    @POST("auth/logout")
    suspend fun logout(@Body request: RefreshTokenRequest): Response<ApiResponse<Unit>>
    
    @GET("auth/me")
    suspend fun getProfile(): Response<ApiResponse<UserDto>>
    
    @PUT("auth/me")
    suspend fun updateProfile(@Body request: UpdateProfileRequest): Response<ApiResponse<UserDto>>
    
    // Project endpoints
    @GET("projects")
    suspend fun getProjects(
        @Query("limit") limit: Int = 20,
        @Query("offset") offset: Int = 0,
        @Query("filter") filter: String? = null
    ): Response<ApiResponse<PaginatedResponse<ProjectDto>>>
    
    @POST("projects")
    suspend fun createProject(@Body request: CreateProjectRequest): Response<ApiResponse<ProjectDto>>
    
    @GET("projects/{projectId}")
    suspend fun getProject(@Path("projectId") projectId: String): Response<ApiResponse<ProjectDetailDto>>
    
    @PUT("projects/{projectId}")
    suspend fun updateProject(
        @Path("projectId") projectId: String,
        @Body request: UpdateProjectRequest
    ): Response<ApiResponse<ProjectDto>>
    
    @DELETE("projects/{projectId}")
    suspend fun deleteProject(@Path("projectId") projectId: String): Response<ApiResponse<Unit>>
    
    @GET("projects/{projectId}/files")
    suspend fun getProjectFiles(@Path("projectId") projectId: String): Response<ApiResponse<List<ProjectFileDto>>>
    
    @POST("projects/{projectId}/files")
    suspend fun createFile(
        @Path("projectId") projectId: String,
        @Body request: CreateFileRequest
    ): Response<ApiResponse<ProjectFileDto>>
    
    @PUT("projects/{projectId}/files/{fileId}")
    suspend fun updateFile(
        @Path("projectId") projectId: String,
        @Path("fileId") fileId: String,
        @Body request: UpdateFileRequest
    ): Response<ApiResponse<ProjectFileDto>>
    
    @DELETE("projects/{projectId}/files/{fileId}")
    suspend fun deleteFile(
        @Path("projectId") projectId: String,
        @Path("fileId") fileId: String
    ): Response<ApiResponse<Unit>>
    
    // AI endpoints
    @POST("ai/sessions")
    suspend fun createAISession(@Body request: CreateAISessionRequest): Response<ApiResponse<AISessionDto>>
    
    @GET("ai/sessions/{sessionId}")
    suspend fun getAISession(@Path("sessionId") sessionId: String): Response<ApiResponse<AISessionDto>>
    
    @POST("ai/sessions/{sessionId}/messages")
    suspend fun sendMessage(
        @Path("sessionId") sessionId: String,
        @Body request: SendMessageRequest
    ): Response<ApiResponse<MessageResponse>>
    
    @GET("ai/sessions/{sessionId}/messages")
    suspend fun getMessages(
        @Path("sessionId") sessionId: String,
        @Query("limit") limit: Int = 50,
        @Query("beforeMessageId") beforeMessageId: String? = null
    ): Response<ApiResponse<MessagesResponse>>
    
    @DELETE("ai/sessions/{sessionId}")
    suspend fun deleteAISession(@Path("sessionId") sessionId: String): Response<ApiResponse<Unit>>
    
    @GET("ai/agents")
    suspend fun getAvailableAgents(): Response<ApiResponse<List<AIAgentDto>>>
    
    @GET("ai/models")
    suspend fun getAvailableModels(): Response<ApiResponse<List<AIModelDto>>>
    
    @POST("ai/execute")
    suspend fun executeCode(@Body request: ExecuteCodeRequest): Response<ApiResponse<ExecutionResponse>>
    
    @GET("ai/execute/{executionId}")
    suspend fun getExecutionResult(@Path("executionId") executionId: String): Response<ApiResponse<CodeExecutionDto>>
}