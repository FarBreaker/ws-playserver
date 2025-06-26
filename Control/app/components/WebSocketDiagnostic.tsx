"use client";

import { useCallback, useState } from "react";
import useWebSocket from "react-use-websocket";

export default function WebSocketDiagnostic() {
	const [testResults, setTestResults] = useState<string[]>([]);
	const [isTesting, setIsTesting] = useState(false);
	const [testUrl, setTestUrl] = useState("ws://127.0.0.1:8000/ws");

	const addResult = useCallback((result: string) => {
		setTestResults((prev) => [
			...prev,
			`${new Date().toLocaleTimeString()}: ${result}`,
		]);
	}, []);

	const { sendMessage, lastMessage, readyState, getWebSocket } = useWebSocket(
		testUrl,
		{
			onOpen: () => {
				addResult("✅ WebSocket connection opened successfully");
			},
			onClose: (event) => {
				addResult(
					`WebSocket closed: Code ${event.code} - ${getCloseCodeMeaning(event.code)}`,
				);
				if (event.wasClean) {
					addResult("✅ Connection closed cleanly");
				} else {
					addResult("❌ Connection closed unexpectedly");
				}
			},
			onError: (event) => {
				addResult(`❌ WebSocket error: ${event}`);
			},
			onMessage: (event) => {
				addResult(`📨 Received: ${event.data}`);
			},
			shouldReconnect: () => false, // Disable auto-reconnect for testing
			retryOnError: false,
		},
	);

	const testBasicConnection = useCallback(async () => {
		setIsTesting(true);
		setTestResults([]);

		addResult("Starting WebSocket diagnostic tests...");
		addResult(`Testing connection to: ${testUrl}`);

		// The connection will be established automatically by the hook
		// We just need to wait and observe the events
		setTimeout(() => {
			if (readyState === 1) {
				addResult("✅ Connection test successful");
				addResult("Sending test message...");
				sendMessage("Hello from diagnostic test");

				setTimeout(() => {
					addResult("Closing test connection...");
					getWebSocket()?.close(1000, "Test completed");
					setIsTesting(false);
				}, 2000);
			} else {
				addResult(`❌ Connection failed. Ready state: ${readyState}`);
				setIsTesting(false);
			}
		}, 3000);
	}, [testUrl, readyState, sendMessage, getWebSocket, addResult]);

	const getCloseCodeMeaning = (code: number): string => {
		switch (code) {
			case 1000:
				return "Normal Closure";
			case 1001:
				return "Going Away";
			case 1002:
				return "Protocol Error";
			case 1003:
				return "Unsupported Data";
			case 1005:
				return "No Status Received";
			case 1006:
				return "Abnormal Closure";
			case 1007:
				return "Invalid frame payload data";
			case 1008:
				return "Policy Violation";
			case 1009:
				return "Message too big";
			case 1010:
				return "Client terminating";
			case 1011:
				return "Server terminating";
			case 1015:
				return "TLS Handshake";
			default:
				return "Unknown";
		}
	};

	const testWithDifferentProtocols = useCallback(async () => {
		addResult("Testing with different WebSocket protocols (ws:// only)...");

		const protocols = [undefined, ["websocket"], ["ws"]];

		for (let i = 0; i < protocols.length; i++) {
			const protocol = protocols[i];
			addResult(
				`Testing protocol: ${protocol ? protocol.join(", ") : "default"}`,
			);

			// Create a temporary WebSocket for each protocol test
			try {
				const ws = new WebSocket(testUrl, protocol);

				const timeout = setTimeout(() => {
					addResult(
						`Protocol ${protocol ? protocol.join(", ") : "default"}: Timeout`,
					);
				}, 3000);

				ws.onopen = () => {
					clearTimeout(timeout);
					addResult(
						`✅ Protocol ${protocol ? protocol.join(", ") : "default"}: Success`,
					);
					ws.close(1000, "Test completed");
				};

				ws.onerror = () => {
					clearTimeout(timeout);
					addResult(
						`❌ Protocol ${protocol ? protocol.join(", ") : "default"}: Failed`,
					);
				};
			} catch (error) {
				addResult(
					`❌ Protocol ${protocol ? protocol.join(", ") : "default"}: Error - ${error}`,
				);
			}
		}
	}, [testUrl, addResult]);

	const testHTTPUpgrade = useCallback(async () => {
		addResult("Testing HTTP upgrade to WebSocket (ws://)...");

		try {
			// Convert ws:// URL to http:// for the upgrade test
			const httpUrl = testUrl.replace("ws://", "http://");
			const response = await fetch(httpUrl, {
				method: "GET",
				headers: {
					Upgrade: "websocket",
					Connection: "Upgrade",
					"Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==",
					"Sec-WebSocket-Version": "13",
				},
			});

			addResult(`HTTP Response Status: ${response.status}`);
			addResult(
				`HTTP Response Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`,
			);

			if (response.status === 101) {
				addResult("✅ Server properly responds to WebSocket upgrade request");
				addResult("The handshake is working correctly!");
			} else {
				addResult("❌ Server does not support WebSocket upgrade");
			}
		} catch (error) {
			addResult(`❌ HTTP test failed: ${error}`);
		}
	}, [testUrl, addResult]);

	const testWithUserAgent = useCallback(async () => {
		addResult("Testing with different User-Agent headers...");

		try {
			const httpUrl = testUrl.replace("ws://", "http://");
			const response = await fetch(httpUrl, {
				method: "GET",
				headers: {
					"User-Agent":
						"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
					Upgrade: "websocket",
					Connection: "Upgrade",
					"Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==",
					"Sec-WebSocket-Version": "13",
				},
			});

			addResult(`HTTP Response with User-Agent: ${response.status}`);
		} catch (error) {
			addResult(`❌ User-Agent test failed: ${error}`);
		}
	}, [testUrl, addResult]);

	const testConnectionWithPing = useCallback(async () => {
		addResult("Testing connection with ping/pong (ws://)...");

		if (readyState === 1) {
			addResult("✅ Connection is open, testing ping...");

			addResult("Sending test message...");
			sendMessage("ping");

			setTimeout(() => {
				addResult("Sending JSON test message...");
				sendMessage('{"type": "ping", "data": "test"}');

				setTimeout(() => {
					addResult("Closing connection...");
					getWebSocket()?.close(1000, "Test completed");
				}, 1000);
			}, 1000);
		} else {
			addResult(`❌ Connection not ready. Current state: ${readyState}`);
		}
	}, [readyState, sendMessage, getWebSocket, addResult]);

	const testDifferentPorts = useCallback(async () => {
		addResult("Testing common WebSocket ports (ws://)...");

		const ports = [8000, 8080, 3001, 3000, 9000];

		for (const port of ports) {
			try {
				const wsUrl = `ws://127.0.0.1:${port}/ws`;
				const ws = new WebSocket(wsUrl);

				const timeout = setTimeout(() => {
					addResult(`Port ${port}: Timeout`);
				}, 2000);

				ws.onopen = () => {
					clearTimeout(timeout);
					addResult(`✅ Port ${port}: Connection successful`);
					ws.close();
				};

				ws.onerror = () => {
					clearTimeout(timeout);
					addResult(`❌ Port ${port}: Connection failed`);
				};
			} catch (error) {
				addResult(`❌ Port ${port}: Error - ${error}`);
			}
		}
	}, [addResult]);

	const clearResults = () => {
		setTestResults([]);
	};

	const getReadyStateText = (state: number): string => {
		switch (state) {
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
	};

	return (
		<div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg border border-gray-200">
			<h2 className="text-2xl font-bold mb-4 text-gray-800">
				WebSocket Diagnostic Tool
			</h2>

			{/* Test URL Input */}
			<div className="mb-4">
				<input
					type="text"
					value={testUrl}
					onChange={(e) => setTestUrl(e.target.value)}
					placeholder="Test URL (e.g., ws://127.0.0.1:8000/ws)"
					className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
				/>
			</div>

			<div className="flex flex-wrap gap-2 mb-4">
				<button
					type="button"
					onClick={testBasicConnection}
					disabled={isTesting}
					className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:bg-gray-400"
				>
					{isTesting ? "Testing..." : "Test Basic Connection"}
				</button>

				<button
					type="button"
					onClick={testConnectionWithPing}
					disabled={isTesting || readyState !== 1}
					className="px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-600 transition-colors disabled:bg-gray-400"
				>
					Test with Ping
				</button>

				<button
					type="button"
					onClick={testWithDifferentProtocols}
					disabled={isTesting}
					className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors disabled:bg-gray-400"
				>
					Test Protocols
				</button>

				<button
					type="button"
					onClick={testHTTPUpgrade}
					disabled={isTesting}
					className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:bg-gray-400"
				>
					Test HTTP Upgrade
				</button>

				<button
					type="button"
					onClick={testWithUserAgent}
					disabled={isTesting}
					className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors disabled:bg-gray-400"
				>
					Test User-Agent
				</button>

				<button
					type="button"
					onClick={testDifferentPorts}
					disabled={isTesting}
					className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors disabled:bg-gray-400"
				>
					Test Ports
				</button>

				<button
					type="button"
					onClick={clearResults}
					className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
				>
					Clear
				</button>
			</div>

			{/* Connection Status */}
			<div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded text-sm">
				<div>
					<strong>Test URL:</strong> {testUrl}
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

			<div className="bg-gray-100 rounded p-4 h-96 overflow-y-auto border border-gray-200">
				{testResults.length === 0 ? (
					<div className="text-gray-500 text-center py-8">
						Click a test button to start diagnostics
					</div>
				) : (
					<div className="space-y-1 text-sm font-mono">
						{testResults.map((result, index) => (
							<div
								key={`result-${index}-${result.substring(0, 20)}`}
								className="text-gray-800"
							>
								{result}
							</div>
						))}
					</div>
				)}
			</div>

			<div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-gray-800">
				<strong>Using react-use-websocket library:</strong>
				<ul className="list-disc list-inside mt-2 space-y-1">
					<li>✅ Battle-tested WebSocket implementation</li>
					<li>✅ Automatic reconnection handling</li>
					<li>✅ Better error handling and debugging</li>
					<li>✅ TypeScript support</li>
					<li>✅ More reliable than custom implementation</li>
				</ul>
			</div>
		</div>
	);
}
