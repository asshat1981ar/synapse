package com.synapse.app.data.api.dto

import com.google.gson.annotations.SerializedName

data class CreateAISessionRequest(
    @SerializedName("projectId")
    val projectId: String,
    @SerializedName("agents")
    val agents: List<String>,
    @SerializedName("context")
    val context: Map<String, String>? = null
)

data class SendMessageRequest(
    @SerializedName("message")
    val message: String,
    @SerializedName("messageType")
    val messageType: String,
    @SerializedName("targetAgent")
    val targetAgent: String? = null
)

data class ExecuteCodeRequest(
    @SerializedName("projectId")
    val projectId: String? = null,
    @SerializedName("language")
    val language: String,
    @SerializedName("code")
    val code: String,
    @SerializedName("input")
    val input: String? = null,
    @SerializedName("timeoutMs")
    val timeoutMs: Int = 30000
)

data class AISessionDto(
    @SerializedName("id")
    val id: String,
    @SerializedName("userId")
    val userId: String,
    @SerializedName("projectId")
    val projectId: String,
    @SerializedName("activeAgents")
    val activeAgents: List<String>,
    @SerializedName("context")
    val context: Map<String, String>,
    @SerializedName("startedAt")
    val startedAt: String,
    @SerializedName("lastActivity")
    val lastActivity: String,
    @SerializedName("status")
    val status: String
)

data class AIMessageDto(
    @SerializedName("id")
    val id: String,
    @SerializedName("sessionId")
    val sessionId: String,
    @SerializedName("senderType")
    val senderType: String,
    @SerializedName("senderId")
    val senderId: String,
    @SerializedName("content")
    val content: String,
    @SerializedName("messageType")
    val messageType: String,
    @SerializedName("targetAgent")
    val targetAgent: String? = null,
    @SerializedName("metadata")
    val metadata: MessageMetadataDto? = null,
    @SerializedName("createdAt")
    val createdAt: String
)

data class MessageMetadataDto(
    @SerializedName("model")
    val model: String? = null,
    @SerializedName("tokens")
    val tokens: Int? = null,
    @SerializedName("responseTime")
    val responseTime: Long? = null,
    @SerializedName("confidence")
    val confidence: Float? = null
)

data class MessageResponse(
    @SerializedName("userMessage")
    val userMessage: AIMessageDto,
    @SerializedName("aiResponse")
    val aiResponse: AIMessageDto
)

data class MessagesResponse(
    @SerializedName("messages")
    val messages: List<AIMessageDto>,
    @SerializedName("hasMore")
    val hasMore: Boolean
)

data class AIAgentDto(
    @SerializedName("id")
    val id: String,
    @SerializedName("name")
    val name: String,
    @SerializedName("description")
    val description: String,
    @SerializedName("capabilities")
    val capabilities: List<String>,
    @SerializedName("isActive")
    val isActive: Boolean
)

data class AIModelDto(
    @SerializedName("id")
    val id: String,
    @SerializedName("provider")
    val provider: String,
    @SerializedName("name")
    val name: String,
    @SerializedName("capabilities")
    val capabilities: List<String>,
    @SerializedName("pricing")
    val pricing: ModelPricingDto? = null,
    @SerializedName("isAvailable")
    val isAvailable: Boolean
)

data class ModelPricingDto(
    @SerializedName("input")
    val input: Double,
    @SerializedName("output")
    val output: Double
)

data class ExecutionResponse(
    @SerializedName("executionId")
    val executionId: String,
    @SerializedName("status")
    val status: String
)

data class CodeExecutionDto(
    @SerializedName("id")
    val id: String,
    @SerializedName("userId")
    val userId: String,
    @SerializedName("projectId")
    val projectId: String?,
    @SerializedName("language")
    val language: String,
    @SerializedName("code")
    val code: String,
    @SerializedName("input")
    val input: String?,
    @SerializedName("status")
    val status: String,
    @SerializedName("result")
    val result: ExecutionResultDto? = null,
    @SerializedName("createdAt")
    val createdAt: String,
    @SerializedName("startedAt")
    val startedAt: String? = null,
    @SerializedName("completedAt")
    val completedAt: String? = null,
    @SerializedName("executionTime")
    val executionTime: Long? = null
)

data class ExecutionResultDto(
    @SerializedName("output")
    val output: String,
    @SerializedName("exitCode")
    val exitCode: Int,
    @SerializedName("memoryUsed")
    val memoryUsed: Long,
    @SerializedName("cpuTime")
    val cpuTime: Long,
    @SerializedName("error")
    val error: String? = null
)