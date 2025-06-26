# Warp Drive - WebSocket Server

A high-performance WebSocket server built in Rust using the Warp framework that can handle browser connections and real-time communication.

## Features

- ✅ WebSocket protocol support via Warp
- ✅ Browser compatibility with CORS support
- ✅ Echo server functionality
- ✅ Ping/Pong heartbeat support
- ✅ Binary message support
- ✅ Health check endpoint
- ✅ Comprehensive error handling
- ✅ Logging with different levels
- ✅ Modern async/await architecture

## Quick Start

### 1. Build and Run the Server

```bash
# Build the project
cargo build --release

# Run the server (defaults to 127.0.0.1:8000)
cargo run

# Or specify a custom address
cargo run 0.0.0.0:8080
```

### 2. Test with Browser

1. Open `test.html` in your browser
2. Click "Connect" to establish a WebSocket connection
3. Type messages and click "Send" to test the echo functionality

### 3. Connect from Next.js

In your Next.js application, you can connect to the WebSocket server like this:

```javascript
// In your Next.js component or page
import { useEffect, useState } from 'react';

export default function WebSocketComponent() {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connect to the WebSocket server
    const ws = new WebSocket('ws://127.0.0.1:8000/ws');
    
    ws.onopen = () => {
      console.log('Connected to WebSocket server');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      console.log('Received:', event.data);
      setMessages(prev => [...prev, event.data]);
    };

    ws.onclose = () => {
      console.log('Disconnected from WebSocket server');
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    setSocket(ws);

    // Cleanup on unmount
    return () => {
      ws.close();
    };
  }, []);

  const sendMessage = (message) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(message);
    }
  };

  return (
    <div>
      <h1>WebSocket Client</h1>
      <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      
      <div>
        <input 
          type="text" 
          placeholder="Type a message..."
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              sendMessage(e.target.value);
              e.target.value = '';
            }
          }}
        />
      </div>

      <div>
        <h3>Messages:</h3>
        <ul>
          {messages.map((msg, index) => (
            <li key={index}>{msg}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

## Server Endpoints

- **WebSocket**: `ws://127.0.0.1:8000/ws` - Main WebSocket endpoint
- **Health Check**: `http://127.0.0.1:8000/health` - Server health status

## Server Configuration

### Environment Variables

- `RUST_LOG`: Set logging level (default: info)
  - `debug`, `info`, `warn`, `error`

### Command Line Arguments

- First argument: Server address (default: `127.0.0.1:8000`)

### Examples

```bash
# Run with debug logging
RUST_LOG=debug cargo run

# Run on all interfaces
cargo run 0.0.0.0:8080

# Run with custom port
cargo run 127.0.0.1:9000
```

## WebSocket Protocol Support

The server supports all standard WebSocket message types:

- **Text Messages**: UTF-8 encoded strings
- **Binary Messages**: Raw binary data
- **Ping/Pong**: Heartbeat mechanism
- **Close Frames**: Graceful connection termination

## Error Handling

The server includes comprehensive error handling for:

- Connection timeouts
- Protocol errors
- IO errors
- Unexpected disconnections
- Invalid handshakes

## Performance Features

- Built on Warp's high-performance async runtime
- Efficient message handling
- Connection pooling ready
- CORS support for browser compatibility

## Development

### Prerequisites

- Rust 1.70+ 
- Cargo

### Building

```bash
# Debug build
cargo build

# Release build
cargo build --release

# Run tests
cargo test
```

### Logging

The server uses the `log` crate with different log levels:

- `error!`: Critical errors
- `warn!`: Warning messages
- `info!`: General information
- `debug!`: Debug information (when RUST_LOG=debug)

## Troubleshooting

### Common Issues

1. **Connection Refused**: Make sure the server is running and the port is correct
2. **CORS Issues**: The server includes CORS headers for browser compatibility
3. **Timeout**: Check if the server is overloaded or network issues exist

### Debug Mode

Run with debug logging to see detailed connection information:

```bash
RUST_LOG=debug cargo run
```

### Health Check

Test if the server is running by visiting:
```
http://127.0.0.1:8000/health
```

## License

This project is open source and available under the MIT License. 