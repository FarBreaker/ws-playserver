"use client";

import { useCallback, useState } from "react";
import useWebSocket from "react-use-websocket";

interface Message {
	id: string;
	content: string;
	timestamp: Date;
	type: "sent" | "received";
}

export default function WebSocketClient() {
	const [messages, setMessages] = useState<Message[]>([]);
	const [inputMessage, setInputMessage] = useState("");
	const [serverUrl, setServerUrl] = useState("ws://127.0.0.1:8000/ws");

	const {
		sendMessage,
		lastMessage,
		readyState,
		getWebSocket,
		sendJsonMessage,
	} = useWebSocket(serverUrl, {
		onOpen: () => {
			console.log("WebSocket connection opened");
			const newMessage: Message = {
				id: Date.now().toString(),
				content: "Connected to WebSocket server",
				timestamp: new Date(),
				type: "received",
			};
			setMessages((prev) => [...prev, newMessage]);
		},
		onClose: (event) => {
			console.log("WebSocket connection closed:", event);
			const newMessage: Message = {
				id: Date.now().toString(),
				content: `Disconnected from WebSocket server (Code: ${event.code})`,
				timestamp: new Date(),
				type: "received",
			};
			setMessages((prev) => [...prev, newMessage]);
		},
		onError: (event) => {
			console.error("WebSocket error:", event);
			const newMessage: Message = {
				id: Date.now().toString(),
				content: `WebSocket error: ${event}`,
				timestamp: new Date(),
				type: "received",
			};
			setMessages((prev) => [...prev, newMessage]);
		},
		onMessage: (event) => {
			console.log("WebSocket message received:", event.data);
			const newMessage: Message = {
				id: Date.now().toString(),
				content: event.data,
				timestamp: new Date(),
				type: "received",
			};
			setMessages((prev) => [...prev, newMessage]);
		},
		shouldReconnect: (closeEvent) => {
			// Reconnect on abnormal closure (1006) or other non-clean closes
			return closeEvent.code !== 1000;
		},
		reconnectAttempts: 3,
		reconnectInterval: 5000,
		retryOnError: true,
	});

	const handleSendMessage = useCallback(() => {
		if (inputMessage.trim() && readyState === 1) {
			// 1 = OPEN
			sendMessage(inputMessage);

			const newMessage: Message = {
				id: Date.now().toString(),
				content: inputMessage,
				timestamp: new Date(),
				type: "sent",
			};
			setMessages((prev) => [...prev, newMessage]);
			setInputMessage("");
		}
	}, [inputMessage, sendMessage, readyState]);

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSendMessage();
		}
	};

	const clearMessages = () => {
		setMessages([]);
	};

	const getConnectionStatus = () => {
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

	const validateAndUpdateUrl = () => {
		let url = serverUrl.trim();

		// Ensure it starts with ws://
		if (!url.startsWith("ws://") && !url.startsWith("wss://")) {
			if (url.includes("://")) {
				url = url.replace(/^https?:\/\//, "ws://");
			} else {
				url = `ws://${url}`;
			}
		}

		// Convert wss:// to ws:// if needed
		if (url.startsWith("wss://")) {
			url = url.replace("wss://", "ws://");
		}

		setServerUrl(url);
	};

	const connectionStatus = getConnectionStatus();

	return (
		<div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg border border-gray-200">
			<div className="mb-6">
				<h1 className="text-3xl font-bold text-gray-800 mb-4">
					WebSocket Client
				</h1>

				{/* Connection Status */}
				<div className="flex items-center gap-4 mb-4">
					<div className="flex items-center gap-2">
						<div
							className={`w-3 h-3 rounded-full ${connectionStatus.bgColor}`}
						/>
						<span className={`font-medium ${connectionStatus.color}`}>
							{connectionStatus.status.charAt(0).toUpperCase() +
								connectionStatus.status.slice(1)}
						</span>
					</div>

					<div className="flex gap-2">
						{readyState === 1 ? (
							<button
								type="button"
								onClick={() => getWebSocket()?.close()}
								className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
							>
								Disconnect
							</button>
						) : (
							<button
								type="button"
								onClick={() => window.location.reload()}
								className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
							>
								Reconnect
							</button>
						)}
					</div>
				</div>

				{/* Server URL Input */}
				<div className="flex gap-2 mb-4">
					<input
						type="text"
						value={serverUrl}
						onChange={(e) => setServerUrl(e.target.value)}
						placeholder="WebSocket URL (e.g., ws://127.0.0.1:8000/ws)"
						className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
					/>
					<button
						type="button"
						onClick={validateAndUpdateUrl}
						className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
					>
						Update URL
					</button>
				</div>

				{/* Connection Info */}
				<div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-gray-800">
					<div>
						<strong>Current URL:</strong> {serverUrl}
					</div>
					<div>
						<strong>Protocol:</strong>{" "}
						{serverUrl.startsWith("ws://")
							? "ws:// (Plain WebSocket)"
							: "Other"}
					</div>
					<div>
						<strong>Status:</strong> {connectionStatus.status}
					</div>
					<div>
						<strong>Ready State:</strong> {readyState} (
						{getReadyStateText(readyState)})
					</div>
					{lastMessage && (
						<div>
							<strong>Last Message:</strong> {lastMessage.data}
						</div>
					)}
				</div>
			</div>

			{/* Messages Display */}
			<div className="bg-gray-50 rounded-lg p-4 mb-4 h-96 overflow-y-auto border border-gray-200">
				{messages.length === 0 ? (
					<div className="text-gray-500 text-center py-8">
						No messages yet. Start the conversation!
					</div>
				) : (
					<div className="space-y-3">
						{messages.map((message) => (
							<div
								key={message.id}
								className={`flex ${message.type === "sent" ? "justify-end" : "justify-start"}`}
							>
								<div
									className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
										message.type === "sent"
											? "bg-blue-500 text-white"
											: "bg-white text-gray-800 border border-gray-200"
									}`}
								>
									<div className="text-sm">{message.content}</div>
									<div
										className={`text-xs mt-1 ${
											message.type === "sent"
												? "text-blue-100"
												: "text-gray-500"
										}`}
									>
										{message.timestamp.toLocaleTimeString()}
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Message Input */}
			<div className="flex gap-2 mb-4">
				<input
					type="text"
					value={inputMessage}
					onChange={(e) => setInputMessage(e.target.value)}
					onKeyPress={handleKeyPress}
					placeholder="Type your message..."
					disabled={readyState !== 1}
					className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900"
				/>
				<button
					type="button"
					onClick={handleSendMessage}
					disabled={readyState !== 1 || !inputMessage.trim()}
					className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
				>
					Send
				</button>
			</div>

			{/* Controls */}
			<div className="flex gap-2">
				<button
					type="button"
					onClick={clearMessages}
					className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
				>
					Clear Messages
				</button>
			</div>
		</div>
	);
}

function getReadyStateText(readyState: number): string {
	switch (readyState) {
		case 0:
			return "CONNECTING";
		case 1:
			return "OPEN";
		case 2:
			return "CLOSING";
		case 3:
			return "CLOSED";
		default:
			return "UNKNOWN";
	}
}
