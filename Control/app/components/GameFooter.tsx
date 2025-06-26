"use client";

import type { Player } from "../stores/gameStore";

interface GameFooterProps {
	players: Player[];
}

export default function GameFooter({ players }: GameFooterProps) {
	return (
		<div className="p-6 bg-black/20 backdrop-blur-sm border-t border-gray-800">
			<div className="flex items-center justify-between text-gray-400 text-base">
				<div className="flex items-center gap-6">
					<span className="font-mono">CLICK TO MOVE</span>
					<span className="font-mono">•</span>
					<span className="font-mono">REAL-TIME SYNC</span>
				</div>
				<div className="flex items-center gap-6">
					{players.map((player) => (
						<div key={player.id} className="flex items-center gap-2">
							<div
								className="w-3 h-3 rounded-full border border-gray-700"
								style={{ backgroundColor: player.color }}
							/>
							<span className="font-mono text-sm">
								{player.isCurrentPlayer
									? "YOU"
									: player.name || `P${player.id.slice(-3)}`}
							</span>
							{!player.isCurrentPlayer && (
								<div
									className={`w-2 h-2 rounded-full ${player.online ? "bg-green-400" : "bg-red-400"}`}
								/>
							)}
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
