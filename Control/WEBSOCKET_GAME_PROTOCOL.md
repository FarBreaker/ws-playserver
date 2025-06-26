# WebSocket Game Protocol

The GridGame component expects to communicate with a WebSocket server using the following JSON message protocol.

## Client to Server Messages

### Player Join
When a player connects, send this message:
```json
{
  "type": "player_join",
  "playerId": "player_1234567890_abc123",
  "color": "#3B82F6",
  "position": {
    "x": 2,
    "y": 2
  }
}
```

### Player Move
When a player clicks on a grid cell, send this message:
```json
{
  "type": "player_move",
  "playerId": "player_1234567890_abc123",
  "position": {
    "x": 3,
    "y": 1
  }
}
```

## Server to Client Messages

### Game State Update
Send the complete game state to all clients:
```json
{
  "type": "game_state",
  "state": {
    "players": [
      {
        "id": "player_1234567890_abc123",
        "x": 2,
        "y": 2,
        "color": "#3B82F6",
        "isCurrentPlayer": true
      },
      {
        "id": "player_0987654321_def456",
        "x": 1,
        "y": 3,
        "color": "#EF4444",
        "isCurrentPlayer": false
      }
    ],
    "currentPlayer": {
      "id": "player_1234567890_abc123",
      "x": 2,
      "y": 2,
      "color": "#3B82F6",
      "isCurrentPlayer": true
    }
  }
}
```

### Player Moved
Notify all clients when a player moves:
```json
{
  "type": "player_moved",
  "playerId": "player_1234567890_abc123",
  "position": {
    "x": 3,
    "y": 1
  }
}
```

### Player Joined
Notify all clients when a new player joins:
```json
{
  "type": "player_joined",
  "player": {
    "id": "player_1234567890_abc123",
    "x": 2,
    "y": 2,
    "color": "#3B82F6",
    "isCurrentPlayer": false
  }
}
```

### Player Left
Notify all clients when a player disconnects:
```json
{
  "type": "player_left",
  "playerId": "player_1234567890_abc123"
}
```

## Server Implementation Example (Python with FastAPI)

```python
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from typing import List, Dict
import json
import uuid

app = FastAPI()

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.players: Dict[str, dict] = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                # Remove disconnected clients
                self.active_connections.remove(connection)

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message["type"] == "player_join":
                player_id = message["playerId"]
                manager.players[player_id] = {
                    "id": player_id,
                    "x": message["position"]["x"],
                    "y": message["position"]["y"],
                    "color": message["color"],
                    "isCurrentPlayer": False
                }
                
                # Send current game state to new player
                game_state = {
                    "type": "game_state",
                    "state": {
                        "players": list(manager.players.values()),
                        "currentPlayer": manager.players[player_id]
                    }
                }
                await manager.send_personal_message(json.dumps(game_state), websocket)
                
                # Notify other players
                join_notification = {
                    "type": "player_joined",
                    "player": manager.players[player_id]
                }
                await manager.broadcast(json.dumps(join_notification))
                
            elif message["type"] == "player_move":
                player_id = message["playerId"]
                if player_id in manager.players:
                    manager.players[player_id]["x"] = message["position"]["x"]
                    manager.players[player_id]["y"] = message["position"]["y"]
                    
                    # Broadcast move to all clients
                    move_notification = {
                        "type": "player_moved",
                        "playerId": player_id,
                        "position": message["position"]
                    }
                    await manager.broadcast(json.dumps(move_notification))
                    
    except WebSocketDisconnect:
        # Find and remove the disconnected player
        disconnected_player_id = None
        for player_id, player in manager.players.items():
            # In a real implementation, you'd track which WebSocket belongs to which player
            pass
        
        if disconnected_player_id:
            del manager.players[disconnected_player_id]
            leave_notification = {
                "type": "player_left",
                "playerId": disconnected_player_id
            }
            await manager.broadcast(json.dumps(leave_notification))
        
        manager.disconnect(websocket)
```

## Features

- **5x5 Grid**: Players can move to any cell in the grid
- **Real-time Movement**: See other players move in real-time
- **Unique Colors**: Each player gets a unique color
- **Player Tracking**: See all connected players and their positions
- **Connection Status**: Visual indicator of WebSocket connection status
- **Accessibility**: Keyboard navigation support (Enter/Space to move)

## Grid Coordinates

The grid uses 0-based coordinates:
- Top-left: (0, 0)
- Top-right: (4, 0)
- Bottom-left: (0, 4)
- Bottom-right: (4, 4)
- Center: (2, 2)

Players start at the center position (2, 2) when they first join. 