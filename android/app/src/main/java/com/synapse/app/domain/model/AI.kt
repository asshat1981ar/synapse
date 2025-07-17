package com.synapse.app.domain.model

import android.os.Parcelable
import kotlinx.parcelize.Parcelize

@Parcelize
data class AISession(
    val id: String,
    val userId: String,
    val projectId: String,
    val activeAgents: List<String>,
    val context: Map<String, String>,
    val startedAt: String,
    val lastActivity: String,
    val status: SessionStatus
) : Parcelable

@Parcelize
enum class SessionStatus : Parcelable {
    ACTIVE,
    PAUSED,
    COMPLETED,
    ERROR
}

@Parcelize
data class AIMessage(
    val id: String,
    val sessionId: String,
    val senderType: MessageSenderType,
    val senderId: String,
    val content: String,
    val messageType: MessageType,
    val targetAgent: String? = null,
    val metadata: MessageMetadata? = null,
    val createdAt: String
) : Parcelable

@Parcelize
enum class MessageSenderType : Parcelable {
    USER,
    AGENT,
    SYSTEM
}

@Parcelize
enum class MessageType : Parcelable {
    USER_INPUT,
    SYSTEM_COMMAND,
    RESPONSE,
    COLLABORATION,
    CODE_GENERATION,
    ARCHITECTURE_ADVICE
}

@Parcelize
data class MessageMetadata(
    val model: String? = null,
    val tokens: Int? = null,
    val responseTime: Long? = null,
    val confidence: Float? = null
) : Parcelable

@Parcelize
data class AIAgent(
    val id: String,
    val name: String,
    val description: String,
    val capabilities: List<String>,
    val isActive: Boolean
) : Parcelable

@Parcelize
data class AIModel(
    val id: String,
    val provider: String,
    val name: String,
    val capabilities: List<String>,
    val pricing: ModelPricing?,
    val isAvailable: Boolean
) : Parcelable

@Parcelize
data class ModelPricing(
    val input: Double,
    val output: Double
) : Parcelable

@Parcelize
data class CodeExecution(
    val id: String,
    val userId: String,
    val projectId: String?,
    val language: String,
    val code: String,
    val input: String?,
    val status: ExecutionStatus,
    val result: ExecutionResult? = null,
    val createdAt: String,
    val startedAt: String? = null,
    val completedAt: String? = null,
    val executionTime: Long? = null
) : Parcelable

@Parcelize
enum class ExecutionStatus : Parcelable {
    QUEUED,
    RUNNING,
    COMPLETED,
    FAILED,
    TIMEOUT
}

@Parcelize
data class ExecutionResult(
    val output: String,
    val exitCode: Int,
    val memoryUsed: Long,
    val cpuTime: Long,
    val error: String? = null
) : Parcelable