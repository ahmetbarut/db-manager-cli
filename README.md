# Database Manager CLI

A powerful command-line interface tool for managing multiple database connections and executing queries with advanced features like syntax highlighting, query history, autocomplete, and interactive console.

## Features

✨ **Multi-Database Support**
- MySQL
- PostgreSQL  
- SQLite
- MongoDB

🎨 **Advanced Query Experience**
- Syntax highlighting for SQL and MongoDB queries
- Smart autocomplete with SQL keywords, table names, and context-aware suggestions
- Interactive query editor with multi-line support
- Query templates for common operations (SELECT, INSERT, UPDATE, DELETE, etc.)
- Query history with search and statistics
- Auto-completion and validation

📊 **Rich Output & Visualization**
- Formatted table output for query results
- Execution time tracking
- Success/failure statistics
- Colorized console output with proper terminal compatibility

🔒 **Connection Management**
- Secure connection storage
- Multiple connection profiles
- Easy switching between databases
- Connection testing and validation

🚀 **Developer Experience**
- Interactive query console
- Query builder with templates
- Command history and statistics
- Comprehensive error handling

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd db-manager-cli

# Install dependencies
npm install

# Build the project
npm run build

# Create global symlink (optional)
npm link
```

## Quick Start

```bash
# Add a new database connection
npm run start connect

# List all connections
npm run start list

# Start interactive query console
npm run start query

# Query specific connection
npm run start query <connection-id>
```

## Usage

### Commands

#### `connect` - Add New Database Connection
```bash
npm run start connect
```
Interactive wizard to add MySQL, PostgreSQL, SQLite, or MongoDB connections.

#### `list` - Show All Connections
```bash
npm run start list
```
Display all saved database connections with management options.

#### `query [connection-id]` - Interactive Query Console
```bash
npm run start query                    # Select from available connections
npm run start query my-connection-id   # Use specific connection
```

### Query Console Features

#### 🔍 **Smart Autocomplete Mode**
- Type-ahead suggestions for SQL keywords
- Table name completion
- Context-aware suggestions (e.g., suggests WHERE after table names)
- Database-specific keyword completion

#### ⚡ **Quick Query Templates**
Choose from pre-built query templates:
- Select all from table
- Count records
- Find by condition
- Group and count
- Inner join tables
- Insert, Update, Delete operations
- Create table templates

#### 📝 **Multi-line Query Editor**
- Line-by-line input
- Real-time query preview
- Edit existing queries
- Line numbering

#### 📜 **Query History**
- Browse recent queries
- Execute previous queries
- Edit and re-run queries
- Search query history

#### Special Commands in Query Console:
- `.exit` - Exit the console
- `.clear` - Clear screen
- `.tables` - Show available tables
- `.history` - Show query history
- `.history clear` - Clear query history

## Configuration

### Storage Locations
- **Connections**: `~/.dbcli/connections.json`
- **Query History**: `~/.dbcli/query_history.json`

### Environment Variables
- `FORCE_COLOR=1` - Force color output in terminals that don't auto-detect
- `DBCLI_CONFIG_DIR` - Custom config directory (default: `~/.dbcli`)

## Examples

### MySQL Connection
```bash
npm run start connect
# Select MySQL → Enter host, port, username, password, database
```

### PostgreSQL with SSL
```bash
npm run start connect
# Select PostgreSQL → Configure host, enable SSL
```

### SQLite Local File
```bash
npm run start connect
# Select SQLite → Enter file path (e.g., ./database.db)
```

### MongoDB Connection
```bash
npm run start connect
# Select MongoDB → Enter URI (e.g., mongodb://localhost:27017/mydb)
```

### Query Examples

**SQL with Autocomplete:**
```sql
SELECT * FROM users WHERE status = 'active' ORDER BY created_at DESC LIMIT 10;
```

**MongoDB Query:**
```javascript
db.users.find({ "status": "active" }).sort({ "created_at": -1 }).limit(10)
```

## Development

### Project Structure
```
src/
├── commands/          # CLI command implementations
│   ├── connect.ts     # Database connection wizard
│   ├── query.ts       # Interactive query console
│   ├── list.ts        # Connection management
│   └── connections.ts # Connection operations
├── database/          # Database client implementations
│   ├── factory.ts     # Database client factory
│   ├── mysql.ts       # MySQL client
│   ├── postgresql.ts  # PostgreSQL client
│   ├── sqlite.ts      # SQLite client
│   └── mongodb.ts     # MongoDB client
├── utils/             # Utility modules
│   ├── config.ts      # Configuration management
│   ├── history.ts     # Query history
│   ├── query-input.ts # Interactive query input
│   ├── autocomplete.ts # Smart autocomplete provider
│   └── syntax-highlighter.ts # SQL/MongoDB highlighting
├── types/             # TypeScript type definitions
│   └── database.ts    # Database interfaces
└── index.ts           # CLI entry point
```

### Building and Testing
```bash
# Development with TypeScript
npm run dev

# Build for production
npm run build

# Start built version
npm run start
```

### Adding New Database Support
1. Create client implementation in `src/database/`
2. Add to factory in `src/database/factory.ts`
3. Update connection wizard in `src/commands/connect.ts`
4. Add database-specific keywords to `src/utils/autocomplete.ts`

## Troubleshooting

### Colors Not Working
If you see ANSI escape codes instead of colors:
```bash
# Force color support
FORCE_COLOR=1 npm run start query

# Or use the built-in color forcing
npm run start query  # Color forcing is now enabled by default
```

### Connection Issues
- **MySQL/PostgreSQL**: Check host, port, credentials, and network connectivity
- **SQLite**: Verify file path and permissions
- **MongoDB**: Ensure MongoDB server is running and URI is correct

### Performance Issues
- Large result sets are automatically limited to 50 rows for display
- Use LIMIT clauses for better performance
- Query execution time is tracked and displayed

### TypeScript Errors
```bash
# Clean and rebuild
rm -rf dist/
npm run build
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Features Roadmap

- [ ] Query result export (CSV, JSON)
- [ ] Database schema visualization
- [ ] Query performance analysis
- [ ] Custom query snippets
- [ ] Multi-database query execution
- [ ] Query result caching
- [ ] Advanced filtering and searching 