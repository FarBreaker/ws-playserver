"use client";

import { useCallback, useEffect } from "react";
import useWebSocket from "react-use-websocket";
import { useGameStore } from "../stores/gameStore";

export function useWebSocketGame() {
	const {
		playerId,
		playerColor,
		playerName,
		setConnected,
		setShowNameModal,
		handlePlayerJoin,
		handlePlayerMove,
		handlePlayerDisconnect,
		handlePlayerReconnect,
		handleGameState,
		cleanupDuplicatePlayers,
	} = useGameStore();

	const {
		sendMessage,
		lastMessage,
		readyState: wsReadyState,
		getWebSocket,
	} = useWebSocket("ws://192.168.1.12:8000/ws", {
		onOpen: () => {
			console.log("Grid game WebSocket connected");
			console.log("Player ID:", playerId);
			console.log("Player Color:", playerColor);
			setConnected(true);
			setShowNameModal(true);
		},
		onMessage: (event) => {
			console.log("=== SERVER MESSAGE RECEIVED ===");
			console.log("Raw message:", event.data);
			console.log("Message type:", typeof event.data);
			console.log("Message length:", event.data?.length);

			try {
				let messageData = event.data;

				// Handle Rust/Warp server format: "[Client id]: {json}"
				if (typeof event.data === "string" && event.data.includes("]: ")) {
					const jsonStart = event.data.indexOf("]: ") + 3;
					messageData = event.data.substring(jsonStart);
					console.log("Extracted JSON from server message:", messageData);
				}

				// Check if it's a JSON message
				if (
					typeof messageData === "string" &&
					messageData.trim().startsWith("{")
				) {
					const data = JSON.parse(messageData);
					console.log("✅ Successfully parsed JSON:", data);
					console.log("Message type field:", data.type);
					console.log("Full parsed data:", JSON.stringify(data, null, 2));

					// Route messages to store handlers
					switch (data.type) {
						case "game_state":
							handleGameState(data);
							break;
						case "player_move":
						case "player_moved":
							handlePlayerMove(data);
							break;
						case "player_join":
							handlePlayerJoin(data);
							break;
						case "player_reconnect":
							handlePlayerReconnect(data);
							// Clean up any duplicate players after reconnection
							cleanupDuplicatePlayers();
							break;
						case "player_left":
						case "client_disconnected":
							handlePlayerDisconnect(data);
							break;
						default:
							console.log(
								"Unknown message type:",
								data.type,
								"Full message:",
								data,
							);
					}
				} else {
					// Handle non-JSON messages (like connection confirmations)
					console.log("⚠️ Non-JSON message received:", event.data);

					// If it's a connection confirmation or echo, we can ignore it
					if (typeof event.data === "string") {
						if (
							event.data.includes("Connected") ||
							event.data.includes("connected") ||
							event.data.includes("player_join") ||
							event.data.includes("player_move")
						) {
							console.log("🔄 Ignoring connection/echo message:", event.data);
							return;
						}
					}

					// For any other non-JSON message, log it but don't try to parse
					console.log(
						"❓ Unhandled message type:",
						typeof event.data,
						"Content:",
						event.data,
					);
				}
			} catch (error) {
				console.error("❌ Failed to parse game message:", error);
				console.error("❌ Raw message that failed to parse:", event.data);

				// If it's a string that starts with 'C', it might be a connection message
				if (typeof event.data === "string" && event.data.startsWith("C")) {
					console.log("🔗 Likely connection confirmation message:", event.data);
					return;
				}
			}
			console.log("=== END SERVER MESSAGE ===");
		},
		onClose: (event) => {
			console.log("Grid game WebSocket closed:", event);
			setConnected(false);
		},
		onError: (event) => {
			console.error("Grid game WebSocket error:", event);
			setConnected(false);
		},
		shouldReconnect: (closeEvent) => closeEvent.code !== 1000,
		reconnectAttempts: 3,
		reconnectInterval: 5000,
		retryOnError: true,
	});

	// Update store readyState when WebSocket state changes
	useEffect(() => {
		useGameStore.getState().setReadyState(wsReadyState);
	}, [wsReadyState]);

	const sendJoinMessage = useCallback(() => {
		if (useGameStore.getState().isConnected) {
			const joinMessage = {
				type: "player_join",
				player_id: playerId,
				player_name: playerName.trim(),
				color: playerColor,
				position: { x: 20, y: 15 },
			};
			console.log("Sending join message with name:", joinMessage);
			sendMessage(JSON.stringify(joinMessage));
		}
	}, [sendMessage, playerId, playerName, playerColor]);

	const sendMoveMessage = useCallback(
		(x: number, y: number) => {
			const moveMessage = {
				type: "player_move",
				player_id: playerId,
				position: { x, y },
			};
			console.log("Sending move message:", moveMessage);
			sendMessage(JSON.stringify(moveMessage));
		},
		[sendMessage, playerId],
	);

	return {
		sendJoinMessage,
		sendMoveMessage,
		lastMessage,
		readyState: wsReadyState,
		getWebSocket,
	};
}
