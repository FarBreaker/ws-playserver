"use client";

import type { Player } from "../stores/gameStore";

interface GameHeaderProps {
	players: Player[];
	currentPlayer: Player | null;
	connectionStatus: {
		status: string;
		color: string;
		bgColor: string;
	};
	readyState: number;
}

export default function GameHeader({
	players,
	currentPlayer,
	connectionStatus,
	readyState,
}: GameHeaderProps) {
	return (
		<div className="flex items-center justify-between p-6 bg-black/20 backdrop-blur-sm border-b border-gray-800">
			<div className="flex items-center gap-6">
				<h1 className="text-2xl font-bold text-gray-200 font-mono tracking-wider">
					ADVENTURE MAP
				</h1>
				<div className="flex items-center gap-3">
					<div
						className={`w-3 h-3 rounded-full ${connectionStatus.bgColor} ${readyState === 1 ? "animate-pulse" : ""}`}
					/>
					<span
						className={`text-gray-400 text-base font-mono ${connectionStatus.color}`}
					>
						{connectionStatus.status.toUpperCase()}
					</span>
				</div>
			</div>

			<div className="flex items-center gap-6">
				<div className="bg-gray-800/50 px-4 py-2 rounded border border-gray-700">
					<span className="text-gray-300 text-base font-mono">
						PLAYERS: {players.length}
					</span>
				</div>
				<div className="text-gray-400 text-base font-mono">
					{currentPlayer
						? `POS: (${currentPlayer.x}, ${currentPlayer.y})`
						: "NOT PLACED"}
				</div>
			</div>
		</div>
	);
}
