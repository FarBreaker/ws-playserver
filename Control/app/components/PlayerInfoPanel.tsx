"use client";

import { useState } from "react";
import type { Player } from "../stores/gameStore";
import { useGameStore } from "../stores/gameStore";

interface PlayerInfoPanelProps {
	players: Player[];
	currentPlayer: Player | null;
	connectionStatus: {
		status: string;
		color: string;
		bgColor: string;
	};
	readyState: number;
}

export default function PlayerInfoPanel({
	players,
	currentPlayer,
	connectionStatus,
	readyState,
}: PlayerInfoPanelProps) {
	const {
		manualCleanup,
		clearStoredPlayerData,
		setHighlightedPlayer,
		highlightedPlayerId,
	} = useGameStore();
	const [isCollapsed, setIsCollapsed] = useState(false);
	return (
		<div className="w-80 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg h-fit max-h-full overflow-hidden flex flex-col">
			{/* Collapsible Header */}
			<div className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
				<h2 className="text-lg font-bold text-gray-200 font-mono">
					PLAYER INFO
				</h2>
				<button
					type="button"
					onClick={() => setIsCollapsed(!isCollapsed)}
					className="text-gray-400 hover:text-gray-200 transition-colors"
					aria-label={isCollapsed ? "Expand panel" : "Collapse panel"}
				>
					{isCollapsed ? "▼" : "▲"}
				</button>
			</div>

			{/* Collapsible Content */}
			{!isCollapsed && (
				<div className="p-4 flex-1 overflow-y-auto">
					{/* Current Player Section */}
					<div className="mb-6">
						<h3 className="text-sm font-semibold text-gray-300 mb-3 font-mono">
							YOUR CHARACTER
						</h3>
						{currentPlayer ? (
							<div className="bg-gray-700/30 rounded p-3 border border-gray-600">
								<div className="flex items-center gap-3 mb-3">
									<div
										className="w-4 h-4 rounded-full border border-gray-600"
										style={{ backgroundColor: currentPlayer.color }}
									/>
									<span className="text-gray-200 font-mono font-semibold">
										{currentPlayer.name || "Unnamed"}
									</span>
								</div>
								<div className="space-y-2 text-sm">
									<div className="flex justify-between">
										<span className="text-gray-400 font-mono">Position:</span>
										<span className="text-gray-200 font-mono">
											({currentPlayer.x}, {currentPlayer.y})
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-gray-400 font-mono">Player ID:</span>
										<span className="text-gray-200 font-mono text-xs">
											{currentPlayer.id.slice(-8)}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-gray-400 font-mono">Status:</span>
										<span className="text-green-400 font-mono">Online</span>
									</div>
								</div>
							</div>
						) : (
							<div className="bg-gray-700/30 rounded p-3 border border-gray-600">
								<div className="text-gray-400 text-sm font-mono">
									Not placed on map yet
								</div>
							</div>
						)}
					</div>

					{/* Other Players Section */}
					<div className="mb-6">
						<h3 className="text-sm font-semibold text-gray-300 mb-3 font-mono">
							OTHER PLAYERS ({players.filter((p) => !p.isCurrentPlayer).length})
						</h3>
						<div className="space-y-2 max-h-48 overflow-y-auto">
							{players
								.filter((p) => !p.isCurrentPlayer)
								.map((player) => (
									<button
										key={player.id}
										type="button"
										className={`w-full text-left bg-gray-700/30 rounded p-3 border border-gray-600 cursor-pointer transition-all duration-200 hover:bg-gray-700/50 hover:border-gray-500 ${
											player.id === highlightedPlayerId
												? "ring-1 ring-blue-400 bg-blue-900/20"
												: ""
										}`}
										onClick={() =>
											setHighlightedPlayer(
												player.id === highlightedPlayerId ? null : player.id,
											)
										}
										aria-label={`Highlight ${player.name || "player"} on map`}
									>
										<div className="flex items-center gap-3 mb-2">
											<div
												className="w-3 h-3 rounded-full border border-gray-600"
												style={{ backgroundColor: player.color }}
											/>
											<span className="text-gray-200 font-mono text-sm font-semibold">
												{player.name || `P${player.id.slice(-3)}`}
											</span>
										</div>
										<div className="space-y-1 text-xs">
											<div className="flex justify-between">
												<span className="text-gray-400 font-mono">
													Position:
												</span>
												<span className="text-gray-200 font-mono">
													({player.x}, {player.y})
												</span>
											</div>
											<div className="flex justify-between">
												<span className="text-gray-400 font-mono">ID:</span>
												<span className="text-gray-200 font-mono">
													{player.id.slice(-6)}
												</span>
											</div>
											<div className="flex justify-between">
												<span className="text-gray-400 font-mono">Status:</span>
												<span
													className={`font-mono ${player.online ? "text-green-400" : "text-red-400"}`}
												>
													{player.online ? "Online" : "Offline"}
												</span>
											</div>
										</div>
									</button>
								))}
							{players.filter((p) => !p.isCurrentPlayer).length === 0 && (
								<div className="text-gray-400 text-sm font-mono text-center py-4">
									No other players online
								</div>
							)}
						</div>
					</div>

					{/* Connection Status */}
					<div className="mb-4 pt-4 border-t border-gray-700">
						<div className="flex items-center justify-between">
							<span className="text-gray-400 text-sm font-mono">
								Connection:
							</span>
							<div className="flex items-center gap-2">
								<div
									className={`w-2 h-2 rounded-full ${connectionStatus.bgColor} ${readyState === 1 ? "animate-pulse" : ""}`}
								/>
								<span className={`text-sm font-mono ${connectionStatus.color}`}>
									{connectionStatus.status.toUpperCase()}
								</span>
							</div>
						</div>
					</div>

					{/* Debug Section */}
					<div className="pt-4 border-t border-gray-700">
						<h3 className="text-sm font-semibold text-gray-300 mb-3 font-mono">
							DEBUG INFO
						</h3>
						<div className="space-y-2 text-xs font-mono mb-4">
							<div className="flex justify-between">
								<span className="text-gray-400">Total Players:</span>
								<span className="text-gray-200">{players.length}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-400">Online Players:</span>
								<span className="text-gray-200">
									{players.filter((p) => p.online).length}
								</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-400">Current Player ID:</span>
								<span className="text-gray-200">
									{currentPlayer?.id?.slice(-8) || "None"}
								</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-400">Current Player Name:</span>
								<span className="text-gray-200">
									{currentPlayer?.name || "None"}
								</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-400">Duplicate Names:</span>
								<span className="text-gray-200">
									{(() => {
										const names = players.map((p) => p.name).filter(Boolean);
										const uniqueNames = new Set(names);
										return names.length - uniqueNames.size;
									})()}
								</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-400">Duplicate IDs:</span>
								<span className="text-gray-200">
									{(() => {
										const ids = players.map((p) => p.id);
										const uniqueIds = new Set(ids);
										return ids.length - uniqueIds.size;
									})()}
								</span>
							</div>
						</div>

						{/* Manual Cleanup Button */}
						<div className="mb-2">
							<button
								type="button"
								onClick={manualCleanup}
								className="w-full bg-red-600 hover:bg-red-700 text-white text-xs font-mono py-2 px-3 rounded border border-red-500 transition-colors"
							>
								🧹 MANUAL CLEANUP
							</button>
						</div>

						{/* Clear Stored Data Button */}
						<div>
							<button
								type="button"
								onClick={clearStoredPlayerData}
								className="w-full bg-orange-600 hover:bg-orange-700 text-white text-xs font-mono py-2 px-3 rounded border border-orange-500 transition-colors"
							>
								🗑️ CLEAR STORED DATA
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
