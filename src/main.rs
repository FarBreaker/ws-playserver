use log::{error, info};
use std::env;
use std::net::SocketAddr;
use std::collections::HashMap;
use warp::{ws::Message, Filter, Rejection, Reply};
use futures::{SinkExt, StreamExt};
use tokio::sync::RwLock;
use std::sync::Arc;
use uuid::Uuid;
use serde::{Deserialize, Serialize};
use serde_json;

type Clients = Arc<RwLock<HashMap<String, futures::stream::SplitSink<warp::ws::WebSocket, warp::ws::Message>>>>;
type ClientId = String;
type ClientToPlayerMap = Arc<RwLock<HashMap<String, String>>>; // client_id -> player_id

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
struct Position {
    x: i32,
    y: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PlayerMove {
    #[serde(rename = "type")]
    message_type: String,
    player_id: String,
    position: Position,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct GameMessage {
    #[serde(rename = "type")]
    message_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    player_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    player_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    color: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    position: Option<Position>,
    #[serde(skip_serializing_if = "Option::is_none")]
    data: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PlayerInfo {
    name: String,
    color: String,
    position: Position,
    online: bool,
}

struct GameState {
    player_positions: HashMap<String, Position>,
    player_info: HashMap<String, PlayerInfo>,
}

impl GameState {
    fn new() -> Self {
        Self {
            player_positions: HashMap::new(),
            player_info: HashMap::new(),
        }
    }

    fn update_player_position(&mut self, player_id: String, position: Position) {
        let player_id_clone = player_id.clone();
        let position_clone = position.clone();
        self.player_positions.insert(player_id.clone(), position);
        
        // Update position in player_info if it exists
        if let Some(player_info) = self.player_info.get_mut(&player_id) {
            player_info.position = position;
        }
        
        info!("Updated position for player {}: ({}, {})", player_id_clone, position_clone.x, position_clone.y);
    }

    fn add_player_info(&mut self, player_id: String, name: String, color: String, position: Position) {
        let position_clone1 = position.clone();
        let position_clone2 = position.clone();
        let player_info = PlayerInfo {
            name: name.clone(),
            color: color.clone(),
            position: position_clone1,
            online: true, // Default to online
        };
        self.player_info.insert(player_id.clone(), player_info);
        self.player_positions.insert(player_id.clone(), position_clone2);
        info!("Added player info for {}: name={}, color={}", player_id, name, color);
    }

    fn set_player_offline(&mut self, player_id: &str) {
        if let Some(player_info) = self.player_info.get_mut(player_id) {
            player_info.online = false;
            info!("Set player {} offline", player_id);
        }
    }

    fn find_player_by_name(&self, name: &str) -> Option<&String> {
        for (player_id, player_info) in &self.player_info {
            if player_info.name == name {
                return Some(player_id);
            }
        }
        None
    }

    fn update_player_id(&mut self, old_player_id: &str, new_player_id: String) {
        if let Some(player_info) = self.player_info.remove(old_player_id) {
            let player_name = player_info.name.clone();
            let mut updated_player_info = player_info;
            updated_player_info.online = true;
            self.player_info.insert(new_player_id.clone(), updated_player_info);
            
            // Update position mapping
            if let Some(position) = self.player_positions.remove(old_player_id) {
                self.player_positions.insert(new_player_id.clone(), position);
            }
            
            info!("Updated player ID from {} to {} for player {}", old_player_id, new_player_id, player_name);
        }
    }

    fn remove_player(&mut self, player_id: &str) {
        self.player_positions.remove(player_id);
        self.player_info.remove(player_id);
        info!("Removed player {} from game state", player_id);
    }

    fn get_player_position(&self, player_id: &str) -> Option<&Position> {
        self.player_positions.get(player_id)
    }

    fn get_all_positions(&self) -> &HashMap<String, Position> {
        &self.player_positions
    }

    fn get_all_player_info(&self) -> &HashMap<String, PlayerInfo> {
        &self.player_info
    }

    fn get_online_players(&self) -> HashMap<String, PlayerInfo> {
        self.player_info.iter()
            .filter(|(_, player_info)| player_info.online)
            .map(|(player_id, player_info)| (player_id.clone(), player_info.clone()))
            .collect()
    }
}

type SharedGameState = Arc<RwLock<GameState>>;

#[tokio::main]
async fn main() {
    // Initialize logger
    env_logger::init();

    // Get the address to bind to
    let addr = env::args()
        .nth(1)
        .unwrap_or_else(|| "0.0.0.0:8000".to_string());
    let addr: SocketAddr = addr.parse().expect("Invalid addr");

    info!("WebSocket game server starting on: {}", addr);
    info!("Ready to accept browser connections");
    info!("Connect from browser using: ws://{}", addr);

    // Shared state for all connected clients and game state
    let clients: Clients = Arc::new(RwLock::new(HashMap::new()));
    let game_state: SharedGameState = Arc::new(RwLock::new(GameState::new()));
    let client_to_player: ClientToPlayerMap = Arc::new(RwLock::new(HashMap::new()));

    // WebSocket route
    let ws_route = warp::path("ws")
        .and(warp::ws())
        .and(with_clients(clients.clone()))
        .and(with_game_state(game_state.clone()))
        .and(with_client_to_player(client_to_player.clone()))
        .and_then(ws_handler);

    // Health check route
    let health_route = warp::path("health")
        .map(|| "OK");

    // Combine routes
    let routes = ws_route
        .or(health_route)
        .with(warp::cors().allow_any_origin());

    // Start the server
    warp::serve(routes)
        .run(addr)
        .await;
}

fn with_clients(clients: Clients) -> impl Filter<Extract = (Clients,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || clients.clone())
}

fn with_game_state(game_state: SharedGameState) -> impl Filter<Extract = (SharedGameState,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || game_state.clone())
}

fn with_client_to_player(client_to_player: ClientToPlayerMap) -> impl Filter<Extract = (ClientToPlayerMap,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || client_to_player.clone())
}

async fn ws_handler(ws: warp::ws::Ws, clients: Clients, game_state: SharedGameState, client_to_player: ClientToPlayerMap) -> Result<impl Reply, Rejection> {
    info!("New WebSocket connection request");
    Ok(ws.on_upgrade(move |socket| handle_websocket(socket, clients, game_state, client_to_player)))
}

async fn handle_websocket(ws: warp::ws::WebSocket, clients: Clients, game_state: SharedGameState, client_to_player: ClientToPlayerMap) {
    info!("WebSocket connection established from browser");

    // Generate unique client ID
    let client_id = Uuid::new_v4().to_string();
    info!("Client connected with ID: {}", client_id);

    // Split the websocket stream into sender and receiver
    let (sender, mut receiver) = ws.split();

    // Add client to the shared state
    {
        let mut clients_lock = clients.write().await;
        clients_lock.insert(client_id.clone(), sender);
        info!("Total connected clients: {}", clients_lock.len());
    }

    // Send current game state to the new client
    send_game_state_to_client(&clients, &game_state, &client_id).await;

    // Broadcast new client connection to all other clients
    broadcast_client_connected(&clients, &client_id).await;

    // Handle incoming messages
    while let Some(result) = receiver.next().await {
        match result {
            Ok(msg) => {
                if msg.is_text() {
                    let text = msg.to_str().unwrap_or("Invalid UTF-8");
                    info!("Received message from client {}: {}", client_id, text);
                    
                    // Try to parse as game message
                    if let Ok(game_msg) = serde_json::from_str::<GameMessage>(text) {
                        handle_game_message(&clients, &game_state, &client_to_player, &client_id, game_msg).await;
                    } else {
                        // Fallback to regular broadcast for non-game messages
                        broadcast_message(&clients, &client_id, text).await;
                    }
                } else if msg.is_binary() {
                    let data = msg.as_bytes();
                    info!("Received binary message with {} bytes from client {}", data.len(), client_id);
                    
                    // Broadcast binary data to all clients
                    broadcast_binary(&clients, &client_id, data).await;
                } else if msg.is_ping() {
                    info!("Received ping from client {}, sending pong", client_id);
                    if let Err(e) = send_to_client(&clients, &client_id, Message::pong(msg.as_bytes())).await {
                        error!("Error sending pong to client {}: {}", client_id, e);
                        break;
                    }
                } else if msg.is_pong() {
                    info!("Received pong from client {}", client_id);
                } else if msg.is_close() {
                    info!("Client {} disconnected", client_id);
                    break;
                }
            }
            Err(e) => {
                error!("WebSocket error from client {}: {}", client_id, e);
                break;
            }
        }
    }

    // Set player offline if they were registered
    {
        let mut client_to_player_lock = client_to_player.write().await;
        if let Some(player_id) = client_to_player_lock.remove(&client_id) {
            let mut game_state_lock = game_state.write().await;
            game_state_lock.set_player_offline(&player_id);
            
            // Broadcast updated game state to all remaining clients
            let updated_player_info = game_state_lock.get_all_player_info().clone();
            drop(game_state_lock); // Release lock before broadcasting
            
            if !updated_player_info.is_empty() {
                let game_state_message = GameMessage {
                    message_type: "game_state".to_string(),
                    player_id: None,
                    player_name: None,
                    color: None,
                    position: None,
                    data: Some(serde_json::to_value(updated_player_info).unwrap_or_default()),
                };

                if let Ok(msg_str) = serde_json::to_string(&game_state_message) {
                    info!("Broadcasting updated game state after player {} went offline: {}", player_id, msg_str);
                    broadcast_message(&clients, &client_id, &msg_str).await;
                }
            }
        }
    }

    // Broadcast client disconnection to remaining clients
    broadcast_client_disconnected(&clients, &client_id).await;

    // Remove client from the shared state
    {
        let mut clients_lock = clients.write().await;
        clients_lock.remove(&client_id);
        info!("Client {} disconnected. Total connected clients: {}", client_id, clients_lock.len());
    }

    info!("WebSocket connection closed for client {}", client_id);
}

async fn handle_game_message(clients: &Clients, game_state: &SharedGameState, client_to_player: &ClientToPlayerMap, sender_id: &str, game_msg: GameMessage) {
    match game_msg.message_type.as_str() {
        "player_move" => {
            // Clone the message before moving its fields
            let game_msg_clone = game_msg.clone();
            
            if let (Some(player_id), Some(position)) = (game_msg.player_id, game_msg.position) {
                info!("Processing player_move from {}: ({}, {})", player_id, position.x, position.y);
                
                // Track the player_id for this client
                {
                    let mut client_to_player_lock = client_to_player.write().await;
                    client_to_player_lock.insert(sender_id.to_string(), player_id.clone());
                }
                
                // Update game state with new position
                {
                    let mut state_lock = game_state.write().await;
                    state_lock.update_player_position(player_id.clone(), position.clone());
                }

                // Broadcast the original message to all other clients
                if let Ok(msg_str) = serde_json::to_string(&game_msg_clone) {
                    info!("Broadcasting player_move to other clients: {}", msg_str);
                    broadcast_message(clients, sender_id, &msg_str).await;
                } else {
                    error!("Failed to serialize player_move message for broadcast");
                }
            } else {
                error!("Invalid player_move message: missing player_id or position");
            }
        }
        "player_join" => {
            if let (Some(player_id), Some(player_name), Some(color)) = (game_msg.player_id, game_msg.player_name, game_msg.color) {
                info!("Player {} joining the game with name '{}' and color '{}'", player_id, player_name, color);
                
                // Track the player_id for this client
                {
                    let mut client_to_player_lock = client_to_player.write().await;
                    client_to_player_lock.insert(sender_id.to_string(), player_id.clone());
                }
                
                // Check if player with this name already exists
                let existing_player_id = {
                    let state_lock = game_state.read().await;
                    state_lock.find_player_by_name(&player_name).cloned()
                };
                
                if let Some(existing_id) = existing_player_id {
                    // Player exists, update their ID and set them online
                    {
                        let mut state_lock = game_state.write().await;
                        state_lock.update_player_id(&existing_id, player_id.clone());
                    }
                    
                    info!("Player '{}' reconnected with new ID: {}", player_name, player_id);
                    
                    // Broadcast player reconnection to all other clients
                    let reconnect_message = GameMessage {
                        message_type: "player_reconnect".to_string(),
                        player_id: Some(player_id.clone()),
                        player_name: Some(player_name.clone()),
                        color: Some(color.clone()),
                        position: None,
                        data: None,
                    };

                    if let Ok(msg_str) = serde_json::to_string(&reconnect_message) {
                        info!("Broadcasting player reconnection to other clients: {}", msg_str);
                        broadcast_message(clients, sender_id, &msg_str).await;
                    }
                } else {
                    // New player, add them to game state
                    {
                        let mut state_lock = game_state.write().await;
                        state_lock.add_player_info(player_id.clone(), player_name.clone(), color.clone(), Position { x: 0, y: 0 });
                    }
                    
                    // Broadcast player join to all other clients
                    let join_message = GameMessage {
                        message_type: "player_join".to_string(),
                        player_id: Some(player_id.clone()),
                        player_name: Some(player_name.clone()),
                        color: Some(color.clone()),
                        position: None,
                        data: None,
                    };

                    if let Ok(msg_str) = serde_json::to_string(&join_message) {
                        info!("Broadcasting player join to other clients: {}", msg_str);
                        broadcast_message(clients, sender_id, &msg_str).await;
                    }
                }
                
                // Get all current player info and send to the new player
                let player_info = {
                    let state_lock = game_state.read().await;
                    state_lock.get_all_player_info().clone()
                };

                // Send each player's info as a separate player_move message
                for (existing_player_id, existing_player_info) in player_info {
                    if existing_player_id != player_id {
                        let move_message = GameMessage {
                            message_type: "player_move".to_string(),
                            player_id: Some(existing_player_id),
                            player_name: Some(existing_player_info.name),
                            color: Some(existing_player_info.color),
                            position: Some(existing_player_info.position),
                            data: None,
                        };

                        if let Ok(msg_str) = serde_json::to_string(&move_message) {
                            info!("Sending player_move to joining player {}: {}", player_id, msg_str);
                            if let Err(e) = send_to_client(clients, sender_id, Message::text(msg_str)).await {
                                error!("Error sending player_move to joining client {}: {}", sender_id, e);
                            }
                        }
                    }
                }
            } else {
                error!("Invalid player_join message: missing player_id, player_name, or color");
            }
        }
        "get_positions" => {
            // Send current positions to the requesting client
            let positions = {
                let state_lock = game_state.read().await;
                state_lock.get_all_positions().clone()
            };

            let response = GameMessage {
                message_type: "positions_update".to_string(),
                player_id: None,
                player_name: None,
                color: None,
                position: None,
                data: Some(serde_json::to_value(positions).unwrap_or_default()),
            };

            if let Ok(response_str) = serde_json::to_string(&response) {
                if let Err(e) = send_to_client(clients, sender_id, Message::text(response_str)).await {
                    error!("Error sending positions to client {}: {}", sender_id, e);
                }
            }
        }
        _ => {
            // Broadcast all other game messages to all other clients
            if let Ok(msg_str) = serde_json::to_string(&game_msg) {
                info!("Broadcasting game message to other clients: {}", msg_str);
                broadcast_message(clients, sender_id, &msg_str).await;
            }
        }
    }
}

async fn broadcast_message(clients: &Clients, sender_id: &str, message: &str) {
    let mut clients_lock = clients.write().await;
    let mut disconnected_clients = Vec::new();
    let mut broadcast_count = 0;

    info!("Broadcasting message to {} clients (excluding sender {})", clients_lock.len(), sender_id);

    for (client_id, sender) in clients_lock.iter_mut() {
        if client_id != sender_id {
            // Don't send back to the sender
            if let Err(e) = sender.send(Message::text(message.to_string())).await {
                error!("Error broadcasting message to client {}: {}", client_id, e);
                disconnected_clients.push(client_id.clone());
            } else {
                broadcast_count += 1;
                info!("Successfully broadcasted to client {}", client_id);
            }
        }
    }

    info!("Broadcasted message to {} clients", broadcast_count);

    // Clean up disconnected clients
    for client_id in disconnected_clients {
        clients_lock.remove(&client_id);
        info!("Removed disconnected client: {}", client_id);
    }
}

async fn broadcast_binary(clients: &Clients, sender_id: &str, data: &[u8]) {
    let mut clients_lock = clients.write().await;
    let mut disconnected_clients = Vec::new();

    for (client_id, sender) in clients_lock.iter_mut() {
        if client_id != sender_id {
            // Don't send back to the sender
            if let Err(e) = sender.send(Message::binary(data)).await {
                error!("Error broadcasting binary to client {}: {}", client_id, e);
                disconnected_clients.push(client_id.clone());
            }
        }
    }

    // Clean up disconnected clients
    for client_id in disconnected_clients {
        clients_lock.remove(&client_id);
        info!("Removed disconnected client: {}", client_id);
    }
}

async fn send_to_client(clients: &Clients, client_id: &str, message: Message) -> Result<(), Box<dyn std::error::Error>> {
    let mut clients_lock = clients.write().await;
    if let Some(sender) = clients_lock.get_mut(client_id) {
        sender.send(message).await?;
    }
    Ok(())
}

async fn send_game_state_to_client(clients: &Clients, game_state: &SharedGameState, client_id: &str) {
    let player_info = {
        let state_lock = game_state.read().await;
        state_lock.get_all_player_info().clone()
    };

    if !player_info.is_empty() {
        let game_state_message = GameMessage {
            message_type: "game_state".to_string(),
            player_id: None,
            player_name: None,
            color: None,
            position: None,
            data: Some(serde_json::to_value(player_info).unwrap_or_default()),
        };

        if let Ok(msg_str) = serde_json::to_string(&game_state_message) {
            info!("Sending game state to new client {}: {}", client_id, msg_str);
            if let Err(e) = send_to_client(clients, client_id, Message::text(msg_str)).await {
                error!("Error sending game state to client {}: {}", client_id, e);
            }
        }
    }
}

async fn broadcast_client_connected(clients: &Clients, client_id: &str) {
    let connection_message = GameMessage {
        message_type: "client_connected".to_string(),
        player_id: Some(client_id.to_string()),
        player_name: None,
        color: None,
        position: None,
        data: None,
    };

    if let Ok(msg_str) = serde_json::to_string(&connection_message) {
        info!("Broadcasting client connected: {}", msg_str);
        broadcast_message(clients, client_id, &msg_str).await;
    }
}

async fn broadcast_client_disconnected(clients: &Clients, client_id: &str) {
    let disconnection_message = GameMessage {
        message_type: "client_disconnected".to_string(),
        player_id: Some(client_id.to_string()),
        player_name: None,
        color: None,
        position: None,
        data: None,
    };

    if let Ok(msg_str) = serde_json::to_string(&disconnection_message) {
        info!("Broadcasting client disconnected: {}", msg_str);
        broadcast_message(clients, client_id, &msg_str).await;
    }
}
