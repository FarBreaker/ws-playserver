// Generate a random fantasy name
export const generateRandomName = (): string => {
	const prefixes = [
		"Shadow",
		"Iron",
		"Crystal",
		"Dark",
		"Light",
		"Storm",
		"Fire",
		"Ice",
		"Thunder",
		"Mystic",
	];
	const suffixes = [
		"blade",
		"heart",
		"fury",
		"storm",
		"shadow",
		"flame",
		"frost",
		"thunder",
		"spirit",
		"ward",
	];
	const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
	const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
	return `${prefix}${suffix}`;
};

// Get connection status information
export const getConnectionStatus = (readyState: number) => {
	switch (readyState) {
		case 0:
			return {
				status: "connecting",
				color: "text-yellow-600",
				bgColor: "bg-yellow-500",
			};
		case 1:
			return {
				status: "connected",
				color: "text-green-600",
				bgColor: "bg-green-500",
			};
		case 2:
			return {
				status: "closing",
				color: "text-orange-600",
				bgColor: "bg-orange-500",
			};
		case 3:
			return {
				status: "disconnected",
				color: "text-red-600",
				bgColor: "bg-red-500",
			};
		default:
			return {
				status: "unknown",
				color: "text-gray-600",
				bgColor: "bg-gray-500",
			};
	}
};

// Validate grid position
export const isValidGridPosition = (x: number, y: number): boolean => {
	return x >= 0 && x < 40 && y >= 0 && y < 30;
};
