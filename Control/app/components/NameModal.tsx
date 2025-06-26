"use client";

import { useState } from "react";
import { generateRandomName } from "../utils/gameUtils";

interface NameModalProps {
	isOpen: boolean;
	playerName: string;
	onNameChange: (name: string) => void;
	onSubmit: (e: React.FormEvent) => void;
	onRandomName: () => void;
	playerColor: string;
	onColorChange: (color: string) => void;
}

// Predefined color palette with 20 colors, arranged by affinity
const COLOR_PALETTE = [
	// Blues & Cyans
	"#3B82F6", // Blue
	"#0EA5E9", // Sky
	"#06B6D4", // Cyan

	// Reds & Pinks
	"#EF4444", // Red
	"#DC2626", // Red-600
	"#EC4899", // Pink
	"#F43F5E", // Rose

	// Greens & Teals
	"#10B981", // Green
	"#059669", // Green-600
	"#22C55E", // Emerald
	"#14B8A6", // Teal
	"#84CC16", // Lime

	// Yellows & Ambers
	"#EAB308", // Yellow
	"#F59E0B", // Amber
	"#D97706", // Amber-600

	// Purples & Violets
	"#8B5CF6", // Purple
	"#7C3AED", // Violet-600
	"#A855F7", // Violet
	"#6366F1", // Indigo

	// Orange
	"#F97316", // Orange
];

export default function NameModal({
	isOpen,
	playerName,
	onNameChange,
	onSubmit,
	onRandomName,
	playerColor,
	onColorChange,
}: NameModalProps) {
	const [selectedColor, setSelectedColor] = useState(
		playerColor || COLOR_PALETTE[0],
	);

	if (!isOpen) return null;

	const handleColorSelect = (color: string) => {
		setSelectedColor(color);
		onColorChange(color);
	};

	const handleSubmit = (e: React.FormEvent) => {
		onSubmit(e);
	};

	return (
		<div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
			<div className="bg-gray-800/90 backdrop-blur-sm border border-gray-700 rounded-lg p-8 max-w-md w-full">
				<h2 className="text-2xl font-bold text-gray-200 mb-6 font-mono text-center">
					JOIN THE ADVENTURE
				</h2>

				<form onSubmit={handleSubmit} className="space-y-6">
					{/* Name Input */}
					<div>
						<label
							htmlFor="playerName"
							className="block text-gray-300 text-sm font-mono mb-2"
						>
							YOUR NAME
						</label>
						<div className="flex gap-2">
							<input
								type="text"
								id="playerName"
								value={playerName}
								onChange={(e) => onNameChange(e.target.value)}
								placeholder="Enter your name..."
								className="flex-1 bg-gray-700/50 border border-gray-600 rounded px-4 py-3 text-gray-200 font-mono placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							/>
							<button
								type="button"
								onClick={onRandomName}
								className="bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600 rounded px-4 py-3 text-gray-300 font-mono transition-colors"
							>
								🎲
							</button>
						</div>
					</div>

					{/* Color Selection */}
					<fieldset>
						<legend className="block text-gray-300 text-sm font-mono mb-3">
							CHOOSE YOUR COLOR
						</legend>
						<div className="grid grid-cols-5 gap-2">
							{COLOR_PALETTE.map((color) => (
								<button
									key={color}
									type="button"
									onClick={() => handleColorSelect(color)}
									className={`
										w-12 h-12 rounded-lg border-2 transition-all duration-200
										${
											selectedColor === color
												? "border-white shadow-lg scale-110"
												: "border-gray-600 hover:border-gray-400 hover:scale-105"
										}
									`}
									style={{ backgroundColor: color }}
									aria-label={`Select color ${color}`}
								/>
							))}
						</div>
					</fieldset>

					{/* Preview */}
					<div className="bg-gray-700/30 rounded p-4 border border-gray-600">
						<div className="flex items-center gap-3">
							<div
								className="w-6 h-6 rounded-full border border-gray-600"
								style={{ backgroundColor: selectedColor }}
							/>
							<span className="text-gray-200 font-mono">
								{playerName || "Your character"}
							</span>
						</div>
					</div>

					{/* Submit Button */}
					<button
						type="submit"
						disabled={!playerName.trim()}
						className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-mono py-3 px-6 rounded border border-blue-500 transition-colors"
					>
						JOIN GAME
					</button>
				</form>
			</div>
		</div>
	);
}
