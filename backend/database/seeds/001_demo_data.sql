-- Demo data for development environment
-- This file will be run automatically in development mode

-- Only run if we're in development and tables are empty
DO $$
BEGIN
    -- Check if we already have users (skip seeding if not empty)
    IF (SELECT COUNT(*) FROM users) > 0 THEN
        RAISE NOTICE 'Database already has data, skipping seeding';
        RETURN;
    END IF;

    -- Insert demo user
    INSERT INTO users (id, email, display_name, password_hash, preferences) VALUES 
    (
        'a8a7e3c0-1c3f-4d2a-8a3d-3f3e3e3e3e3e',
        'demo@synapse.dev',
        'Demo Developer',
        '$2a$10$rOzx6UVLmUjUkOtU7KU6TeLCfJGdSVJoQCZgZ8VGF1yX3HZ7oQKpW', -- password: 'demo123'
        '{"theme": "dark", "defaultModels": ["gpt-3.5-turbo", "claude-3-sonnet"], "autoSaveInterval": 30000}'::jsonb
    );

    -- Insert demo projects
    INSERT INTO projects (id, name, description, project_type, owner_id, configuration) VALUES 
    (
        'b8a7e3c0-1c3f-4d2a-8a3d-3f3e3e3e3e3e',
        'Todo App',
        'A simple todo application with AI assistance',
        'android_app',
        'a8a7e3c0-1c3f-4d2a-8a3d-3f3e3e3e3e3e',
        '{"targetSdk": 34, "minSdk": 24, "language": "kotlin", "uiFramework": "jetpack_compose", "aiAgents": ["architectrix", "code_conjurer"]}'::jsonb
    ),
    (
        'c8a7e3c0-1c3f-4d2a-8a3d-3f3e3e3e3e3e',
        'Weather API',
        'REST API for weather data with AI-powered insights',
        'api',
        'a8a7e3c0-1c3f-4d2a-8a3d-3f3e3e3e3e3e',
        '{"framework": "express", "language": "javascript", "database": "postgresql", "aiAgents": ["api_architect", "backend_developer"]}'::jsonb
    );

    -- Insert demo files
    INSERT INTO project_files (project_id, file_path, content, language, modified_by) VALUES 
    (
        'b8a7e3c0-1c3f-4d2a-8a3d-3f3e3e3e3e3e',
        'MainActivity.kt',
        'package com.synapse.todoapp

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.synapse.todoapp.ui.theme.TodoAppTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            TodoAppTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    Greeting("Android")
                }
            }
        }
    }
}

@Composable
fun Greeting(name: String, modifier: Modifier = Modifier) {
    Text(
        text = "Hello $name!",
        modifier = modifier
    )
}',
        'kotlin',
        'a8a7e3c0-1c3f-4d2a-8a3d-3f3e3e3e3e3e'
    ),
    (
        'b8a7e3c0-1c3f-4d2a-8a3d-3f3e3e3e3e3e',
        'TodoViewModel.kt',
        'package com.synapse.todoapp.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

data class TodoItem(
    val id: String,
    val title: String,
    val isCompleted: Boolean = false
)

class TodoViewModel : ViewModel() {
    private val _todos = MutableStateFlow<List<TodoItem>>(emptyList())
    val todos: StateFlow<List<TodoItem>> = _todos

    fun addTodo(title: String) {
        viewModelScope.launch {
            val newTodo = TodoItem(
                id = java.util.UUID.randomUUID().toString(),
                title = title
            )
            _todos.value = _todos.value + newTodo
        }
    }

    fun toggleTodo(id: String) {
        viewModelScope.launch {
            _todos.value = _todos.value.map { todo ->
                if (todo.id == id) {
                    todo.copy(isCompleted = !todo.isCompleted)
                } else {
                    todo
                }
            }
        }
    }
}',
        'kotlin',
        'a8a7e3c0-1c3f-4d2a-8a3d-3f3e3e3e3e3e'
    ),
    (
        'c8a7e3c0-1c3f-4d2a-8a3d-3f3e3e3e3e3e',
        'server.js',
        'const express = require(''express'');
const cors = require(''cors'');
const helmet = require(''helmet'');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.get(''/health'', (req, res) => {
    res.json({ status: ''healthy'', timestamp: new Date().toISOString() });
});

app.get(''/api/weather/:city'', async (req, res) => {
    const { city } = req.params;
    
    try {
        // Mock weather data
        const weatherData = {
            city,
            temperature: Math.floor(Math.random() * 30) + 10,
            condition: [''sunny'', ''cloudy'', ''rainy''][Math.floor(Math.random() * 3)],
            humidity: Math.floor(Math.random() * 100),
            timestamp: new Date().toISOString()
        };
        
        res.json(weatherData);
    } catch (error) {
        res.status(500).json({ error: ''Failed to fetch weather data'' });
    }
});

app.listen(PORT, () => {
    console.log(`Weather API server running on port ${PORT}`);
});',
        'javascript',
        'a8a7e3c0-1c3f-4d2a-8a3d-3f3e3e3e3e3e'
    );

    -- Insert demo AI session
    INSERT INTO ai_sessions (id, user_id, project_id, active_agents, context) VALUES 
    (
        'd8a7e3c0-1c3f-4d2a-8a3d-3f3e3e3e3e3e',
        'a8a7e3c0-1c3f-4d2a-8a3d-3f3e3e3e3e3e',
        'b8a7e3c0-1c3f-4d2a-8a3d-3f3e3e3e3e3e',
        ARRAY['architectrix', 'code_conjurer'],
        '{"projectType": "android_app", "language": "kotlin", "framework": "jetpack_compose"}'::jsonb
    );

    -- Insert demo messages
    INSERT INTO ai_messages (session_id, sender_type, sender_id, content, message_type, metadata) VALUES 
    (
        'd8a7e3c0-1c3f-4d2a-8a3d-3f3e3e3e3e3e',
        'user',
        'a8a7e3c0-1c3f-4d2a-8a3d-3f3e3e3e3e3e',
        'Can you help me create a todo app with Jetpack Compose?',
        'user_input',
        '{}'::jsonb
    ),
    (
        'd8a7e3c0-1c3f-4d2a-8a3d-3f3e3e3e3e3e',
        'agent',
        'architectrix',
        'I''d be happy to help you create a todo app with Jetpack Compose! Let me start by outlining the architecture:

1. **MVVM Architecture**: We''ll use ViewModel to manage UI state
2. **Jetpack Compose**: For modern declarative UI
3. **State Management**: Using StateFlow for reactive state
4. **Room Database**: For local data persistence

Would you like me to start with the basic project structure?',
        'response',
        '{"model": "gpt-3.5-turbo", "tokens": 85, "responseTime": 1250}'::jsonb
    ),
    (
        'd8a7e3c0-1c3f-4d2a-8a3d-3f3e3e3e3e3e',
        'user',
        'a8a7e3c0-1c3f-4d2a-8a3d-3f3e3e3e3e3e',
        'Yes, please create the basic structure and a simple todo item UI',
        'user_input',
        '{}'::jsonb
    ),
    (
        'd8a7e3c0-1c3f-4d2a-8a3d-3f3e3e3e3e3e',
        'agent',
        'code_conjurer',
        'Perfect! I''ve created the basic structure for your todo app. Here''s what I''ve implemented:

**TodoViewModel.kt** - Manages the todo state with:
- `TodoItem` data class
- `addTodo()` function
- `toggleTodo()` function
- StateFlow for reactive updates

**MainActivity.kt** - Basic setup with:
- Jetpack Compose integration
- Material 3 theming
- Ready for todo UI components

Next steps:
1. Create the TodoScreen composable
2. Add input field for new todos
3. Display todo list with checkboxes

Should I implement the TodoScreen UI next?',
        'response',
        '{"model": "gpt-4", "tokens": 142, "responseTime": 2100}'::jsonb
    );

    RAISE NOTICE 'Demo data seeded successfully';

END $$;