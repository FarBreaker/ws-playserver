import { create } from "zustand";

export interface Player {
	id: string;
	x: number;
	y: number;
	color: string;
	isCurrentPlayer: boolean;
	name?: string;
	online?: boolean;
}

export interface GameState {
	players: Player[];
	currentPlayer: Player | null;
	playerId: string;
	playerColor: string;
	playerName: string;
	isConnected: boolean;
	showNameModal: boolean;
	readyState: number;
	highlightedPlayerId: string | null;
}

interface GameActions {
	// Player management
	addPlayer: (player: Player) => void;
	updatePlayer: (playerId: string, updates: Partial<Player>) => void;
	removePlayer: (playerId: string) => void;
	setCurrentPlayer: (player: Player | null) => void;

	// Game state management
	setGameState: (players: Player[]) => void;
	updatePlayerPosition: (playerId: string, x: number, y: number) => void;

	// Local player management
	setPlayerId: (id: string) => void;
	setPlayerColor: (color: string) => void;
	setPlayerName: (name: string) => void;

	// Connection management
	setConnected: (connected: boolean) => void;
	setReadyState: (state: number) => void;

	// UI management
	setShowNameModal: (show: boolean) => void;

	// Utility functions
	getPlayerAtPosition: (x: number, y: number) => Player[];
	getCurrentPlayer: () => Player | null;
	isCurrentPlayer: (playerId: string) => boolean;

	// Sync current player from players array
	syncCurrentPlayer: () => void;

	// Clean up duplicate players by name (keep the most recent one)
	cleanupDuplicatePlayers: () => void;

	// Manual cleanup for debugging
	manualCleanup: () => void;

	// Clear stored player data from localStorage
	clearStoredPlayerData: () => void;

	// Highlight player on map
	setHighlightedPlayer: (playerId: string | null) => void;

	// Message handlers
	handlePlayerJoin: (data: Record<string, unknown>) => void;
	handlePlayerMove: (data: Record<string, unknown>) => void;
	handlePlayerDisconnect: (data: Record<string, unknown>) => void;
	handlePlayerReconnect: (data: Record<string, unknown>) => void;
	handleGameState: (data: Record<string, unknown>) => void;
}

// Generate a random color for each player
const generatePlayerColor = (playerId?: string): string => {
	const colors = [
		"#3B82F6",
		"#EF4444",
		"#10B981",
		"#F59E0B",
		"#8B5CF6",
		"#EC4899",
		"#06B6D4",
		"#84CC16",
		"#F97316",
		"#6366F1",
	];

	if (playerId) {
		// Use player ID to generate deterministic color
		const hash = playerId
			.split("")
			.reduce((acc, char) => acc + char.charCodeAt(0), 0);
		return colors[hash % colors.length];
	}

	// Fallback to random color
	return colors[Math.floor(Math.random() * colors.length)];
};

export const useGameStore = create<GameState & GameActions>((set, get) => ({
	// Initial state
	players: [],
	currentPlayer: null,
	playerId: "",
	playerColor: "",
	playerName: "",
	isConnected: false,
	showNameModal: false,
	readyState: 3, // Disconnected
	highlightedPlayerId: null,

	// Player management
	addPlayer: (player) => {
		set((state) => {
			const updatedPlayers = [...state.players, player];
			return {
				players: updatedPlayers,
				// Update currentPlayer if this is the current player being added
				currentPlayer:
					player.id === state.playerId ? player : state.currentPlayer,
			};
		});
	},

	updatePlayer: (playerId, updates) => {
		set((state) => {
			const updatedPlayers = state.players.map((player) =>
				player.id === playerId ? { ...player, ...updates } : player,
			);

			return {
				players: updatedPlayers,
				// Update currentPlayer if this player is the current player
				currentPlayer:
					playerId === state.playerId
						? updatedPlayers.find((p) => p.id === playerId) ||
							state.currentPlayer
						: state.currentPlayer,
			};
		});
	},

	removePlayer: (playerId) => {
		set((state) => {
			const updatedPlayers = state.players.filter(
				(player) => player.id !== playerId,
			);
			return {
				players: updatedPlayers,
				// Clear currentPlayer if the current player is being removed
				currentPlayer: playerId === state.playerId ? null : state.currentPlayer,
			};
		});
	},

	setCurrentPlayer: (player) => {
		set({ currentPlayer: player });
	},

	// Game state management
	setGameState: (players) => {
		set((state) => ({
			players,
			currentPlayer: players.find((p) => p.id === state.playerId) || null,
		}));
	},

	updatePlayerPosition: (playerId, x, y) => {
		set((state) => {
			const updatedPlayers = state.players.map((player) =>
				player.id === playerId ? { ...player, x, y } : player,
			);

			return {
				players: updatedPlayers,
				currentPlayer:
					playerId === state.playerId && state.currentPlayer
						? { ...state.currentPlayer, x, y }
						: state.currentPlayer,
			};
		});
	},

	// Local player management
	setPlayerId: (id) => {
		set({ playerId: id });
	},

	setPlayerColor: (color) => {
		set({ playerColor: color });
	},

	setPlayerName: (name) => {
		set({ playerName: name });
	},

	// Connection management
	setConnected: (connected) => {
		set({ isConnected: connected });
	},

	setReadyState: (state) => {
		set({ readyState: state });
	},

	// UI management
	setShowNameModal: (show) => {
		set({ showNameModal: show });
	},

	// Utility functions
	getPlayerAtPosition: (x, y) => {
		return get().players.filter((player) => player.x === x && player.y === y);
	},

	getCurrentPlayer: () => {
		return get().currentPlayer;
	},

	isCurrentPlayer: (playerId) => {
		return get().playerId === playerId;
	},

	// Sync current player from players array
	syncCurrentPlayer: () => {
		const state = get();
		const currentPlayerFromArray = state.players.find(
			(p) => p.id === state.playerId,
		);

		if (
			currentPlayerFromArray &&
			(!state.currentPlayer ||
				state.currentPlayer.id !== currentPlayerFromArray.id)
		) {
			console.log("🔄 Store: Syncing current player:", currentPlayerFromArray);
			set({ currentPlayer: currentPlayerFromArray });
		} else if (!currentPlayerFromArray && state.currentPlayer) {
			console.log(
				"🔄 Store: Clearing current player - not found in players array",
			);
			set({ currentPlayer: null });
		}
	},

	// Clean up duplicate players by name (keep the most recent one)
	cleanupDuplicatePlayers: () => {
		const state = get();
		const uniquePlayers = new Map<string, Player>();

		// Keep the most recent player for each name
		// Prioritize online players and then by most recent ID
		for (const player of state.players) {
			const existing = uniquePlayers.get(player.name || "");
			if (!existing) {
				uniquePlayers.set(player.name || "", player);
			} else {
				// If we have an existing player, keep the one that's online
				// or the one with the more recent ID (assuming newer IDs are larger)
				if (player.online && !existing.online) {
					uniquePlayers.set(player.name || "", player);
				} else if (player.online === existing.online) {
					// If both have same online status, keep the one with newer ID
					if (player.id > existing.id) {
						uniquePlayers.set(player.name || "", player);
					}
				}
			}
		}

		const cleanedPlayers = Array.from(uniquePlayers.values());

		if (cleanedPlayers.length !== state.players.length) {
			console.log("🧹 Store: Cleaned up duplicate players:", {
				before: state.players.length,
				after: cleanedPlayers.length,
				removed: state.players.length - cleanedPlayers.length,
				removedPlayers: state.players.filter(
					(p) => !cleanedPlayers.find((cp) => cp.id === p.id),
				),
			});

			set({
				players: cleanedPlayers,
				currentPlayer:
					cleanedPlayers.find((p) => p.id === state.playerId) ||
					state.currentPlayer,
			});
		}
	},

	// Manual cleanup for debugging
	manualCleanup: () => {
		const state = get();
		console.log("🧹 Store: Manual cleanup called. Current state:", {
			playersCount: state.players.length,
			players: state.players.map((p) => ({
				id: p.id,
				name: p.name,
				online: p.online,
			})),
			currentPlayer: state.currentPlayer,
		});

		// Run cleanup
		get().cleanupDuplicatePlayers();

		// Sync current player
		get().syncCurrentPlayer();

		const newState = get();
		console.log("🧹 Store: After manual cleanup:", {
			playersCount: newState.players.length,
			players: newState.players.map((p) => ({
				id: p.id,
				name: p.name,
				online: p.online,
			})),
			currentPlayer: newState.currentPlayer,
		});
	},

	// Clear stored player data from localStorage
	clearStoredPlayerData: () => {
		console.log("🗑️ Store: Clearing stored player data from localStorage");

		// Clear localStorage
		localStorage.removeItem("playerId");
		localStorage.removeItem("playerColor");
		localStorage.removeItem("playerName");

		// Clear store state
		set({
			playerId: "",
			playerColor: "",
			playerName: "",
			players: [],
			currentPlayer: null,
		});

		console.log("🗑️ Store: Player data cleared successfully");
	},

	// Highlight player on map
	setHighlightedPlayer: (playerId: string | null) => {
		set({ highlightedPlayerId: playerId });
	},

	// Message handlers
	handlePlayerJoin: (data: Record<string, unknown>) => {
		const state = get();
		console.log("🎮 Store: Handling player join:", data);
		console.log("🎮 Store: Current playerId:", state.playerId);
		console.log("🎮 Store: Current player before join:", state.currentPlayer);

		if (data.player && typeof data.player === "object") {
			// Handle player object format
			const playerData = data.player as Record<string, unknown>;
			const playerWithName = {
				id: String(playerData.id || ""),
				x: Number(playerData.x || 20),
				y: Number(playerData.y || 15),
				color: String(
					playerData.color || generatePlayerColor(String(playerData.id || "")),
				),
				isCurrentPlayer: String(playerData.id || "") === state.playerId,
				name: String(
					playerData.name ||
						playerData.playerName ||
						`P${String(playerData.id || "").slice(-3)}`,
				),
				online: true,
			};
			console.log("🎮 Store: Adding player with name:", playerWithName);
			get().addPlayer(playerWithName);
		} else if (data.player_id) {
			// Handle direct player_join message format
			const newPlayer = {
				id: String(data.player_id),
				x: (data.position as Record<string, unknown>)?.x
					? Number((data.position as Record<string, unknown>).x)
					: 20,
				y: (data.position as Record<string, unknown>)?.y
					? Number((data.position as Record<string, unknown>).y)
					: 15,
				color: String(
					data.color || generatePlayerColor(String(data.player_id)),
				),
				name: String(
					data.player_name ||
						data.name ||
						`P${String(data.player_id).slice(-3)}`,
				),
				isCurrentPlayer: String(data.player_id) === state.playerId,
				online: true,
			};
			console.log("🎮 Store: Adding new player from join message:", newPlayer);
			get().addPlayer(newPlayer);
		}

		// Sync current player after adding
		get().syncCurrentPlayer();
		console.log("🎮 Store: Current player after join:", get().currentPlayer);
	},

	handlePlayerMove: (data: Record<string, unknown>) => {
		const state = get();
		const playerId = String(data.player_id || data.playerId || "");

		if (playerId && data.position && typeof data.position === "object") {
			const position = data.position as Record<string, unknown>;
			console.log("🎮 Store: Player moved:", playerId, position);
			console.log("🎮 Store: Current player before move:", state.currentPlayer);
			get().updatePlayerPosition(
				playerId,
				Number(position.x || 0),
				Number(position.y || 0),
			);
			console.log("🎮 Store: Current player after move:", get().currentPlayer);
		}
	},

	handlePlayerDisconnect: (data: Record<string, unknown>) => {
		const disconnectedPlayerId = String(
			data.player_id || data.playerId || data.client_id || "",
		);

		if (disconnectedPlayerId) {
			console.log("🔌 Store: Client disconnected:", disconnectedPlayerId);
			console.log(
				"🔌 Store: Current players before removal:",
				get().players.map((p) => ({ id: p.id, name: p.name })),
			);
			console.log(
				"🔌 Store: Current player before disconnect:",
				get().currentPlayer,
			);

			// Instead of removing the player, mark them as offline
			const state = get();
			const updatedPlayers = state.players.map((player) =>
				player.id === disconnectedPlayerId
					? { ...player, online: false }
					: player,
			);

			set({
				players: updatedPlayers,
				// Clear currentPlayer if the current player is being disconnected
				currentPlayer:
					disconnectedPlayerId === state.playerId ? null : state.currentPlayer,
			});

			console.log(
				"🔌 Store: Players after marking offline:",
				updatedPlayers.map((p) => ({
					id: p.id,
					name: p.name,
					online: p.online,
				})),
			);
			console.log(
				"🔌 Store: Current player after disconnect:",
				get().currentPlayer,
			);
		}
	},

	handlePlayerReconnect: (data: Record<string, unknown>) => {
		const state = get();
		const newPlayerId = String(data.player_id || "");
		const playerName = String(data.player_name || "");
		const playerColor = String(data.color || "");

		if (newPlayerId && playerName) {
			console.log("🔄 Store: Handling player reconnect:", data);
			console.log(
				"🔄 Store: Current player before reconnect:",
				state.currentPlayer,
			);
			console.log("🔄 Store: Current playerId:", state.playerId);
			console.log(
				"🔄 Store: All players before reconnect:",
				state.players.map((p) => ({
					id: p.id,
					name: p.name,
					online: p.online,
				})),
			);

			// Find existing player by name (this is the key - we match by name, not ID)
			const existingPlayerIndex = state.players.findIndex(
				(p) => p.name === playerName,
			);

			if (existingPlayerIndex !== -1) {
				// Found existing player - update their ID and mark as online
				console.log(
					"🔄 Store: Found existing player by name, updating ID and status",
				);

				const existingPlayer = state.players[existingPlayerIndex];
				const updatedPlayer: Player = {
					...existingPlayer,
					id: newPlayerId, // Update to new ID
					color: playerColor || existingPlayer.color, // Update color if provided
					online: true, // Mark as online
				};

				// Update the player in the array
				const updatedPlayers = [...state.players];
				updatedPlayers[existingPlayerIndex] = updatedPlayer;

				// Check if this was the current player
				const isCurrentPlayer = state.currentPlayer?.name === playerName;

				set({
					players: updatedPlayers,
					// Update currentPlayer if this was the current player
					currentPlayer: isCurrentPlayer ? updatedPlayer : state.currentPlayer,
					// Update stored playerId and color if this was the current player
					...(isCurrentPlayer && {
						playerId: newPlayerId,
						playerColor: playerColor || state.playerColor,
					}),
				});

				console.log(
					"🔄 Store: Player reconnected successfully:",
					updatedPlayer,
				);
				console.log(
					"🔄 Store: All players after reconnect:",
					updatedPlayers.map((p) => ({
						id: p.id,
						name: p.name,
						online: p.online,
					})),
				);
				console.log("🔄 Store: Was current player?", isCurrentPlayer);
			} else {
				// No existing player found - this shouldn't happen for reconnections
				console.log(
					"🔄 Store: No existing player found with name:",
					playerName,
					"- creating new player",
				);

				const newPlayer: Player = {
					id: newPlayerId,
					x: 20, // Default position
					y: 15,
					color: playerColor || generatePlayerColor(newPlayerId),
					name: playerName,
					isCurrentPlayer: false,
					online: true,
				};

				get().addPlayer(newPlayer);
				console.log(
					"🔄 Store: Created new player for reconnection:",
					newPlayer,
				);
			}
		}
	},

	handleGameState: (data: Record<string, unknown>) => {
		if (data.data && typeof data.data === "object") {
			console.log("🎮 Store: Setting game state:", data.data);
			console.log("🎮 Store: Game state data type:", typeof data.data);
			console.log(
				"🎮 Store: Game state keys:",
				Object.keys(data.data as Record<string, unknown>),
			);
			console.log(
				"🎮 Store: Current player before game state update:",
				get().currentPlayer,
			);

			// Convert the object format to array format
			const playersArray = Object.entries(
				data.data as Record<string, unknown>,
			).map(([id, playerData]: [string, unknown]) => {
				const player = playerData as Record<string, unknown>;
				console.log(`🎮 Store: Processing player ${id}:`, player);

				// Extract position from the new format
				const position = (player?.position as Record<string, unknown>) || {};
				const x = Number(position.x || 0);
				const y = Number(position.y || 0);

				// Extract player info from the new format
				const playerName = String(player?.name || `P${id.slice(-3)}`);
				const playerColor = String(player?.color || generatePlayerColor(id));
				const isOnline = Boolean(player?.online);

				console.log(`🎮 Store: Player ${id} resolved to:`, {
					name: playerName,
					color: playerColor,
					position: { x, y },
					online: isOnline,
				});

				return {
					id: id,
					x: x,
					y: y,
					color: playerColor,
					name: playerName,
					isCurrentPlayer: id === get().playerId,
					online: isOnline,
				};
			});

			console.log(
				"🎮 Store: Converted players array with names:",
				playersArray,
			);
			get().setGameState(playersArray);
			console.log(
				"🎮 Store: Current player after game state update:",
				get().currentPlayer,
			);

			// Clean up any duplicate players that might exist
			get().cleanupDuplicatePlayers();

			// Sync current player after cleanup
			get().syncCurrentPlayer();
		}
	},
}));
