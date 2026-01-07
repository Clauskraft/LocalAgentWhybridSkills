#!/usr/bin/env python3

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
import os
from typing import Dict, Any, List, Optional

ROMA_AVAILABLE = False
ROMA_VERSION: Optional[str] = None
try:
    # Optional dependency; may be vendored or installed from a private index.
    from roma_dspy import Executor  # type: ignore
    import importlib.metadata

    ROMA_AVAILABLE = True
    try:
        ROMA_VERSION = importlib.metadata.version("roma_dspy")
    except Exception:
        ROMA_VERSION = None
except Exception:
    ROMA_AVAILABLE = False
    ROMA_VERSION = None

app = FastAPI(title="ROMA Bridge API", version="0.1.0")

class PlanRequest(BaseModel):
    goal: str
    context: Optional[Dict[str, Any]] = None
    strategy: Optional[str] = "react"  # react, cot, code_act

class ActRequest(BaseModel):
    task: str
    context: Optional[Dict[str, Any]] = None
    tools: Optional[List[Dict[str, Any]]] = None

class HealthResponse(BaseModel):
    status: str
    version: str
    roma_version: Optional[str] = None
    roma_available: bool = False

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="ok",
        version="0.1.0",
        roma_version=ROMA_VERSION,
        roma_available=ROMA_AVAILABLE,
    )

@app.post("/plan")
async def plan_task(request: PlanRequest):
    """Plan a task using ROMA Executor"""
    try:
        if not ROMA_AVAILABLE:
            raise HTTPException(
                status_code=503,
                detail="roma_unavailable: roma_dspy is not installed. Provide vendored source or install from your index.",
            )
        # Initialize ROMA Executor with requested strategy
        strategy_map = {
            "react": "ReAct",
            "cot": "CoT",
            "code_act": "CodeAct"
        }

        executor = Executor(
            prediction_strategy=strategy_map.get(request.strategy, "ReAct"),
            lm=get_lm_from_env(),
            tools=get_available_tools(),
        )
        result = executor.plan(request.goal, context=request.context or {})
        return {"plan": result, "status": "planned"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/act")
async def act_on_task(request: ActRequest):
    """Execute a task using ROMA Executor"""
    try:
        if not ROMA_AVAILABLE:
            raise HTTPException(
                status_code=503,
                detail="roma_unavailable: roma_dspy is not installed. Provide vendored source or install from your index.",
            )
        executor = Executor(
            prediction_strategy="ReAct",
            lm=get_lm_from_env(),
            tools=get_available_tools(),
        )
        result = executor.forward(request.task, context=request.context or {}, tools=request.tools or [])
        return {"result": result, "status": "executed"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/schema/plan")
async def plan_schema():
    """Get the schema for plan endpoint"""
    return {
        "name": "roma.plan",
        "description": "Plan a complex task using hierarchical reasoning",
        "inputSchema": {
            "type": "object",
            "properties": {
                "goal": {"type": "string", "description": "The goal to plan for"},
                "context": {"type": "object", "description": "Additional context"},
                "strategy": {"type": "string", "enum": ["react", "cot", "code_act"], "description": "Planning strategy"}
            },
            "required": ["goal"]
        }
    }

@app.get("/schema/act")
async def act_schema():
    """Get the schema for act endpoint"""
    return {
        "name": "roma.act",
        "description": "Execute a planned task with tools",
        "inputSchema": {
            "type": "object",
            "properties": {
                "task": {"type": "string", "description": "The task to execute"},
                "context": {"type": "object", "description": "Execution context"},
                "tools": {"type": "array", "description": "Available tools"}
            },
            "required": ["task"]
        }
    }

def get_lm_from_env():
    """Get language model configuration from environment"""
    # ROMA uses DSPy LMs. Configure with a model string like:
    #   openrouter/anthropic/claude-3.5-sonnet
    #   openai/gpt-4o-mini
    #   ollama/qwen3:8b   (if you have a DSPy adapter configured)
    model = (os.getenv("ROMA_MODEL") or os.getenv("DSPY_MODEL") or "").strip()
    if not model:
        raise HTTPException(status_code=400, detail="missing_config: set ROMA_MODEL (or DSPY_MODEL)")

    try:
        import dspy  # type: ignore
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"dspy_unavailable: {e}")

    temperature_raw = (os.getenv("ROMA_TEMPERATURE") or "0.1").strip()
    max_tokens_raw = (os.getenv("ROMA_MAX_TOKENS") or "600").strip()
    try:
        temperature = float(temperature_raw)
    except Exception:
        temperature = 0.1
    try:
        max_tokens = int(max_tokens_raw)
    except Exception:
        max_tokens = 600

    return dspy.LM(model, temperature=temperature, max_tokens=max_tokens)

def get_available_tools():
    """
    Get available tools for ROMA executor.

    Tools can be configured via:
    1. ROMA_TOOLS_CONFIG environment variable pointing to a JSON file
    2. ROMA_TOOLS environment variable with comma-separated tool names
    3. Default fallback to common MCP tools

    Returns a list of tool definitions compatible with DSPy/ROMA.
    """
    import json

    # Option 1: Load from config file
    tools_config_path = os.getenv("ROMA_TOOLS_CONFIG")
    if tools_config_path and os.path.exists(tools_config_path):
        try:
            with open(tools_config_path, "r") as f:
                return json.load(f)
        except Exception as e:
            print(f"[ROMA] Warning: Failed to load tools config from {tools_config_path}: {e}")

    # Option 2: Parse from environment variable
    tools_env = os.getenv("ROMA_TOOLS", "").strip()
    if tools_env:
        tool_names = [t.strip() for t in tools_env.split(",") if t.strip()]
        return [{"name": name, "description": f"Tool: {name}"} for name in tool_names]

    # Option 3: Default fallback - return common MCP tool stubs
    # These are placeholder definitions; actual implementations come from MCP servers
    default_tools = [
        {
            "name": "search",
            "description": "Search for information in the knowledge base",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"}
                },
                "required": ["query"]
            }
        },
        {
            "name": "read_file",
            "description": "Read contents of a file",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "File path to read"}
                },
                "required": ["path"]
            }
        },
        {
            "name": "write_file",
            "description": "Write content to a file",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "File path to write"},
                    "content": {"type": "string", "description": "Content to write"}
                },
                "required": ["path", "content"]
            }
        },
        {
            "name": "execute_command",
            "description": "Execute a shell command",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "command": {"type": "string", "description": "Command to execute"}
                },
                "required": ["command"]
            }
        }
    ]

    return default_tools


@app.get("/tools")
async def list_tools():
    """List available tools for ROMA executor"""
    tools = get_available_tools()
    return {
        "tools": tools,
        "count": len(tools),
        "source": "config" if os.getenv("ROMA_TOOLS_CONFIG") else ("env" if os.getenv("ROMA_TOOLS") else "default")
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
