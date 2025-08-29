from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Set
import json
import asyncio

router = APIRouter()

# Store active WebSocket connections
active_connections: Dict[str, Set[WebSocket]] = {}

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, operation_id: str):
        await websocket.accept()
        if operation_id not in self.active_connections:
            self.active_connections[operation_id] = set()
        self.active_connections[operation_id].add(websocket)
    
    def disconnect(self, websocket: WebSocket, operation_id: str):
        if operation_id in self.active_connections:
            self.active_connections[operation_id].discard(websocket)
            if not self.active_connections[operation_id]:
                del self.active_connections[operation_id]
    
    async def send_progress(self, operation_id: str, data: dict):
        if operation_id in self.active_connections:
            disconnected = set()
            for connection in self.active_connections[operation_id]:
                try:
                    await connection.send_json(data)
                except Exception as e:
                    disconnected.add(connection)
            
            # Clean up disconnected connections
            for conn in disconnected:
                self.active_connections[operation_id].discard(conn)

manager = ConnectionManager()

@router.websocket("/ws/operations/{operation_id}")
async def websocket_endpoint(websocket: WebSocket, operation_id: str):
    await manager.connect(websocket, operation_id)
    try:
        # Keep connection alive
        while True:
            # Just keep the connection open, don't require client messages
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        manager.disconnect(websocket, operation_id)
    except Exception as e:
        print(f"WebSocket error for {operation_id}: {e}")
        manager.disconnect(websocket, operation_id)

async def broadcast_progress(operation_id: str, progress_data: dict):
    """Broadcast progress updates to all connected clients"""
    await manager.send_progress(operation_id, progress_data)