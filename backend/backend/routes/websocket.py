from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Set, List, Tuple
import json
import asyncio
import time
from collections import deque

router = APIRouter()

# Store active WebSocket connections
active_connections: Dict[str, Set[WebSocket]] = {}

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # Buffer messages for operations that don't have connections yet
        # Store as (timestamp, operation_id, data)
        self.message_buffer: Dict[str, deque] = {}
        self.BUFFER_MAX_SIZE = 100  # Max messages per operation
        self.BUFFER_MAX_AGE = 10  # Max age in seconds
    
    async def connect(self, websocket: WebSocket, operation_id: str):
        await websocket.accept()
        if operation_id not in self.active_connections:
            self.active_connections[operation_id] = set()
        self.active_connections[operation_id].add(websocket)
        
        # Send any buffered messages for this operation
        if operation_id in self.message_buffer:
            current_time = time.time()
            buffer_size = len(self.message_buffer[operation_id])
            # Calculate delay for buffered messages (max 2 seconds total for buffer replay)
            buffer_delay = min(2.0 / buffer_size if buffer_size > 0 else 0.01, 0.05)
            buffer_delay = max(buffer_delay, 0.005)  # Minimum 5ms
            
            while self.message_buffer[operation_id]:
                timestamp, data = self.message_buffer[operation_id][0]
                # Remove old messages
                if current_time - timestamp > self.BUFFER_MAX_AGE:
                    self.message_buffer[operation_id].popleft()
                    continue
                # Send buffered message
                try:
                    await websocket.send_json(data)
                    self.message_buffer[operation_id].popleft()
                    # Dynamic delay between buffered messages for smooth updates
                    await asyncio.sleep(buffer_delay)
                except Exception:
                    break  # Stop if connection fails
            
            # Clean up empty buffer
            if not self.message_buffer[operation_id]:
                del self.message_buffer[operation_id]
    
    def disconnect(self, websocket: WebSocket, operation_id: str):
        if operation_id in self.active_connections:
            self.active_connections[operation_id].discard(websocket)
            if not self.active_connections[operation_id]:
                del self.active_connections[operation_id]
    
    async def send_progress(self, operation_id: str, data: dict):
        # Always buffer the message for late-joining connections
        if operation_id not in self.message_buffer:
            self.message_buffer[operation_id] = deque(maxlen=self.BUFFER_MAX_SIZE)
        self.message_buffer[operation_id].append((time.time(), data))
        
        # Send to active connections
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