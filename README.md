# Redis Desktop Client

A modern, cross-platform Redis client built with Electron and React. Features a clean Material-UI interface and efficient handling of large datasets.

![Redis Client Screenshot](screenshots/app.png)

## Features

- 🚀 Fast and responsive UI built with React and Material-UI
- 💾 Efficient handling of large datasets using Redis SCAN instead of KEYS
- 🔍 Search functionality with pattern matching
- 📝 CRUD operations for Redis keys
- 🔄 Pagination support for large datasets
- 🔌 Multiple connection management
- 🎨 Customizable layout (toggle sidebar position)
- 🔐 Support for Redis authentication
- 💻 Cross-platform support (macOS, Windows, Linux)

## Installation

### macOS

1. Download the latest `.dmg` file from the [Releases](https://github.com/datmt/redis-crud-client/releases) page
2. Double-click the downloaded `.dmg` file
3. Drag the Redis Client app to your Applications folder
4. When first opening the app, you might see a message saying "Redis Client.app is damaged"
   - This happens because the app isn't signed with an Apple Developer certificate
   - To fix this, open Terminal and run:
     ```bash
     xattr -cr "/Applications/Redis Client.app"
     ```
   - Try opening the app again
5. If you see a security warning, go to System Preferences > Security & Privacy and click "Open Anyway"

### Windows
Coming soon

### Linux
Coming soon

## Development

### Prerequisites

- Node.js >= 18
- npm >= 8
- Redis server (for testing)

### Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/redis-electron-client.git
cd redis-electron-client
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

This will start both the React development server and the Electron application.

### Building

To build the application for your current platform:

```bash
# Build React app
npm run build

# Package for current platform
npm run package:mac    # For macOS
npm run package:win    # For Windows
npm run package:linux  # For Linux

# Or build for all platforms
npm run package:all
```

## Project Structure

```
redis-electron-client/
├── src/                    # React application source
│   ├── components/         # React components
│   ├── App.js             # Main React component
│   └── index.js           # React entry point
├── main.js                # Electron main process
├── public/                # Static assets
└── package.json           # Project configuration
```

## Key Technologies

- **Frontend**: React, Material-UI
- **Backend**: Electron, ioredis
- **Build**: electron-builder
- **CI/CD**: GitHub Actions

## Architecture

The application follows a standard Electron architecture with two main processes:

1. **Main Process** (`main.js`):
   - Handles Redis connections
   - Manages IPC communication
   - Implements CRUD operations
   - Handles window management

2. **Renderer Process** (`src/`):
   - React application
   - UI components
   - State management
   - User interactions

Communication between processes is handled via Electron's IPC mechanism.

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## Building and Releasing

The project uses GitHub Actions for automated builds. To create a new release:

1. Update version in `package.json`
2. Create and push a new tag:
```bash
git tag v1.0.0
git push origin v1.0.0
```

This will trigger the build workflow which creates:
- macOS: `.dmg` and `.zip`
- Windows: NSIS installer and portable `.exe`
- Linux: `.AppImage`, `.deb`, and `.rpm`

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Credits

Created by [datmt.com](https://datmt.com)

## Support

For bugs and feature requests, please [open an issue](https://github.com/yourusername/redis-electron-client/issues).
