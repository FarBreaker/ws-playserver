"use client";

import type { Player } from "../stores/gameStore";

interface GameGridProps {
	players: Player[];
	getPlayerAtPosition: (x: number, y: number) => Player[];
	onCellClick: (x: number, y: number) => void;
	onCellKeyDown: (event: React.KeyboardEvent, x: number, y: number) => void;
	highlightedPlayerId: string | null;
}

export default function GameGrid({
	players,
	getPlayerAtPosition,
	onCellClick,
	onCellKeyDown,
	highlightedPlayerId,
}: GameGridProps) {
	return (
		<div className="flex-1 flex items-center justify-center p-4 overflow-auto min-h-0">
			<div className="relative w-full h-full flex items-center justify-center">
				<div
					className="grid grid-cols-40 grid-rows-25 gap-0.5 bg-gray-800/10  rounded-lg border border-gray-700/20 backdrop-blur-sm overflow-auto max-w-full max-h-full"
					style={{
						backgroundImage: `url('/Dungeon Scrawl Map 40x25.png')`,
						backgroundSize: "cover",
						backgroundPosition: "center",
						backgroundRepeat: "no-repeat",
					}}
				>
					{Array.from({ length: 1000 }, (_, index) => {
						const x = index % 40;
						const y = Math.floor(index / 40);
						const playersAtPosition = getPlayerAtPosition(x, y);
						const cellKey = `cell-${x}-${y}`;
						const hasCurrentPlayer = playersAtPosition.some(
							(p) => p.isCurrentPlayer,
						);
						const hasHighlightedPlayer = playersAtPosition.some(
							(p) => p.id === highlightedPlayerId,
						);

						return (
							<button
								key={cellKey}
								type="button"
								onClick={() => onCellClick(x, y)}
								onKeyDown={(e) => onCellKeyDown(e, x, y)}
								aria-label={`Move to position ${x}, ${y}`}
								className={`
                  w-7 h-7 rounded border
                  flex items-center justify-center cursor-pointer
                  transition-all duration-150
                  focus:outline-none focus:ring-1 focus:ring-gray-400
                  ${
										playersAtPosition.length > 0
											? "bg-gray-700/20 border-gray-600/40 shadow-lg"
											: "bg-gray-800/10 border-gray-700/20 hover:bg-gray-700/20 hover:border-gray-600/40"
									}
                  ${hasCurrentPlayer ? "ring-2 ring-opacity-80 shadow-lg animate-pulse" : ""}
                  ${hasHighlightedPlayer ? "ring-2 ring-blue-400 shadow-blue-400/30 animate-pulse" : ""}
                `}
								style={{
									...(hasCurrentPlayer && {
										"--ring-color":
											playersAtPosition.find((p) => p.isCurrentPlayer)?.color ||
											"#F59E0B",
										"--shadow-color":
											playersAtPosition.find((p) => p.isCurrentPlayer)?.color ||
											"#F59E0B",
										boxShadow: `0 0 20px ${playersAtPosition.find((p) => p.isCurrentPlayer)?.color || "#F59E0B"}`,
										borderColor:
											playersAtPosition.find((p) => p.isCurrentPlayer)?.color ||
											"#F59E0B",
									}),
								}}
							>
								{playersAtPosition.length > 0 && (
									<div className="relative flex items-center justify-center">
										<div className="flex flex-wrap justify-center items-center gap-0 max-w-4">
											{playersAtPosition.map((player, index) => (
												<div
													key={player.id}
													className="relative"
													style={{
														zIndex: player.isCurrentPlayer
															? 10
															: playersAtPosition.length - index,
													}}
												>
													<div
														className={`
                              w-1.5 h-1.5 rounded-full shadow-sm border border-gray-900/50 bg-black/20
                              ${player.isCurrentPlayer ? "ring-1 ring-opacity-80 animate-pulse" : ""}
                              ${player.id === highlightedPlayerId ? "ring-1 ring-blue-400 animate-pulse" : ""}
                            `}
														style={{
															backgroundColor: player.color,
															...(player.isCurrentPlayer && {
																boxShadow: `0 0 8px ${player.color}`,
																borderColor: player.color,
															}),
														}}
													/>
												</div>
											))}
										</div>

										{playersAtPosition.length > 1 && (
											<div className="absolute -top-0.5 -right-0.5 bg-gray-900/70 text-gray-300 text-[8px] font-bold rounded-full w-2.5 h-2.5 flex items-center justify-center border border-gray-700/50">
												{playersAtPosition.length}
											</div>
										)}
									</div>
								)}
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
}
