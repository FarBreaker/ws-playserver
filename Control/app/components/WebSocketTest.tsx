"use client";

import { useState } from "react";

export default function WebSocketTest() {
	const [testResult, setTestResult] = useState<string>("");
	const [isTesting, setIsTesting] = useState(false);

	const testWebSocketConnection = async () => {
		setIsTesting(true);
		setTestResult("Testing connection...");

		try {
			const ws = new WebSocket("ws://127.0.0.1:8000");

			const timeout = setTimeout(() => {
				setTestResult("Connection timeout - server may not be running");
				setIsTesting(false);
			}, 5000);

			ws.onopen = () => {
				clearTimeout(timeout);
				setTestResult("✅ WebSocket connection successful!");
				ws.close();
				setIsTesting(false);
			};

			ws.onerror = (error) => {
				clearTimeout(timeout);
				setTestResult(`❌ WebSocket connection failed: ${error}`);
				setIsTesting(false);
			};

			ws.onclose = (event) => {
				clearTimeout(timeout);
				if (event.wasClean) {
					setTestResult("✅ Connection test completed successfully");
				} else {
					setTestResult(
						`❌ Connection closed unexpectedly: ${event.code} ${event.reason}`,
					);
				}
				setIsTesting(false);
			};
		} catch (error) {
			setTestResult(`❌ Error creating WebSocket: ${error}`);
			setIsTesting(false);
		}
	};

	return (
		<div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg border border-gray-200">
			<h2 className="text-xl font-bold mb-4 text-gray-800">
				WebSocket Server Test
			</h2>

			<button
				type="button"
				onClick={testWebSocketConnection}
				disabled={isTesting}
				className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:bg-gray-400"
			>
				{isTesting ? "Testing..." : "Test Connection to ws://127.0.0.1:8000"}
			</button>

			{testResult && (
				<div className="mt-4 p-3 bg-gray-100 rounded text-gray-800">
					<strong>Result:</strong> {testResult}
				</div>
			)}

			<div className="mt-4 text-sm text-gray-600">
				<p>
					<strong>Common issues:</strong>
				</p>
				<ul className="list-disc list-inside mt-2 space-y-1">
					<li>WebSocket server not running on port 8000</li>
					<li>Firewall blocking the connection</li>
					<li>Wrong protocol (ws:// vs wss://)</li>
					<li>CORS issues (if testing from browser)</li>
				</ul>
			</div>
		</div>
	);
}
