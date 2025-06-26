"use client";

import { useCallback, useEffect } from "react";
import { useWebSocketGame } from "../hooks/useWebSocketGame";
import { useGameStore } from "../stores/gameStore";
import {
	generateRandomName,
	getConnectionStatus,
	isValidGridPosition,
} from "../utils/gameUtils";
import GameFooter from "./GameFooter";
import GameGrid from "./GameGrid";
import GameHeader from "./GameHeader";
import NameModal from "./NameModal";
import PlayerInfoPanel from "./PlayerInfoPanel";

export default function GridGame() {
	const {
		// State
		players,
		currentPlayer,
		playerId,
		playerColor,
		playerName,
		isConnected,
		showNameModal,
		readyState,
		highlightedPlayerId,

		// Actions
		setPlayerId,
		setPlayerColor,
		setPlayerName,
		setShowNameModal,
		addPlayer,
		updatePlayerPosition,
		getPlayerAtPosition,
	} = useGameStore();

	const {
		sendJoinMessage,
		sendMoveMessage,
		lastMessage,
		readyState: wsReadyState,
	} = useWebSocketGame();

	// Generate a unique player ID and color on component mount
	useEffect(() => {
		// Check localStorage for existing player ID
		const existingPlayerId = localStorage.getItem("playerId");
		const existingPlayerColor = localStorage.getItem("playerColor");

		if (existingPlayerId) {
			console.log(
				"🎮 GridGame: Found existing player ID in localStorage:",
				existingPlayerId,
			);
			setPlayerId(existingPlayerId);
			if (existingPlayerColor) {
				setPlayerColor(existingPlayerColor);
			}
		} else {
			console.log(
				"🎮 GridGame: No existing player ID found, generating new one",
			);
			const id = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

			// Save to localStorage
			localStorage.setItem("playerId", id);
			setPlayerId(id);
		}
	}, [setPlayerId, setPlayerColor]);

	const handleNameSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (playerName.trim()) {
			// Save player name and color to localStorage
			localStorage.setItem("playerName", playerName.trim());
			localStorage.setItem("playerColor", playerColor);
			setShowNameModal(false);
			sendJoinMessage();
		}
	};

	const handleRandomName = () => {
		const randomName = generateRandomName();
		setPlayerName(randomName);
	};

	const handleGridClick = useCallback(
		(x: number, y: number) => {
			if (wsReadyState !== 1) {
				console.log("Not connected, readyState:", wsReadyState);
				return;
			}

			if (!isValidGridPosition(x, y)) return;

			console.log("Moving player to:", x, y);

			// Send move message to server
			sendMoveMessage(x, y);

			// Update local state immediately for responsiveness
			const existingPlayer = players.find((p) => p.id === playerId);

			if (existingPlayer) {
				// Update existing player position
				updatePlayerPosition(playerId, x, y);
			} else {
				// Create new player if doesn't exist
				const newPlayer = {
					id: playerId,
					x,
					y,
					color: playerColor,
					name: playerName || `P${playerId.slice(-3)}`,
					isCurrentPlayer: true,
					online: true,
				};
				addPlayer(newPlayer);
			}
		},
		[
			wsReadyState,
			sendMoveMessage,
			playerId,
			playerColor,
			playerName,
			players,
			updatePlayerPosition,
			addPlayer,
		],
	);

	const handleGridKeyDown = useCallback(
		(event: React.KeyboardEvent, x: number, y: number) => {
			if (event.key === "Enter" || event.key === " ") {
				event.preventDefault();
				handleGridClick(x, y);
			}
		},
		[handleGridClick],
	);

	const connectionStatus = getConnectionStatus(readyState);

	// Debug: Log current player state
	useEffect(() => {
		console.log("🎮 GridGame: Current player state:", {
			playerId,
			currentPlayer,
			playersCount: players.length,
			players: players.map((p) => ({
				id: p.id,
				name: p.name,
				isCurrent: p.isCurrentPlayer,
			})),
		});
	}, [playerId, currentPlayer, players]);

	return (
		<div className="min-h-screen w-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 relative overflow-hidden">
			{/* Background Pattern */}
			<div className="absolute inset-0 opacity-10 w-full">
				<div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.1)_1px,transparent_0)] bg-[length:20px_20px]" />
			</div>

			{/* Name Modal */}
			<NameModal
				isOpen={showNameModal}
				playerName={playerName}
				onNameChange={setPlayerName}
				onSubmit={handleNameSubmit}
				onRandomName={handleRandomName}
				playerColor={playerColor}
				onColorChange={setPlayerColor}
			/>

			{/* Main Game Container - Optimized for 1920x1080 */}
			<div className="relative z-10 h-screen flex flex-col max-w-[1920px] mx-auto">
				{/* Header - Safe area top */}
				<div className="pt-safe-top">
					<GameHeader
						players={players}
						currentPlayer={currentPlayer}
						connectionStatus={connectionStatus}
						readyState={readyState}
					/>
				</div>

				{/* Game Area - Main content area */}
				<div className="flex-1 flex min-h-0 px-safe-left pr-safe-right">
					{/* Game Grid - Takes most of the space */}
					<div className="flex-1 min-w-0">
						<GameGrid
							players={players}
							getPlayerAtPosition={getPlayerAtPosition}
							onCellClick={handleGridClick}
							onCellKeyDown={handleGridKeyDown}
							highlightedPlayerId={highlightedPlayerId}
						/>
					</div>

					{/* Player Info Panel - Fixed width, safe area right */}
					<div className="pl-safe-right">
						<PlayerInfoPanel
							players={players}
							currentPlayer={currentPlayer}
							connectionStatus={connectionStatus}
							readyState={readyState}
						/>
					</div>
				</div>

				{/* Footer - Safe area bottom */}
				<div className="pb-safe-bottom">
					<GameFooter players={players} />
				</div>
			</div>
		</div>
	);
}
