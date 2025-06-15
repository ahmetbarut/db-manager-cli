# Database Manager CLI

A powerful command-line interface tool for managing multiple database connections and executing queries with advanced features like **real-time interactive editing**, syntax highlighting, query history, and autocomplete.

## ✨ Key Features

### 🎯 **Interactive SQL Editor** (NEW!)
- **Real-time autocomplete** as you type
- **Tab completion** for SQL keywords, table names, and functions
- **Arrow key navigation** through suggestions
- **Smart word completion** - completes the current word intelligently
- **Live suggestions** appear below your query as you type
- **Editor-like experience** similar to VS Code or other IDEs

### 🗄️ **Multi-Database Support**
- MySQL
- PostgreSQL  
- SQLite
- MongoDB

### 🎨 **Advanced Query Experience**
- **🎯 Interactive Editor**: Real-time autocomplete with editor-like experience
- **🔍 Dropdown Autocomplete**: Traditional dropdown-style suggestions
- **📝 Multi-line Editor**: Line-by-line query building
- **⚡ Quick Templates**: Pre-built query templates
- **📜 Query History**: Browse and reuse previous queries
- Syntax highlighting for SQL and MongoDB queries
- Context-aware suggestions (table names after FROM, etc.)

### 📊 **Rich Output & Visualization**
- Formatted table output for query results
- Execution time tracking
- Success/failure statistics
- Colorized console output with proper terminal compatibility

### 🔒 **Connection Management**
- Secure connection storage
- Multiple connection profiles
- Easy switching between databases
- Connection testing and validation

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Add a database connection
npm run start connect

# Start interactive query console
npm run start query
```

## 🎯 Interactive Editor Usage

When you start a query session, select **"🎯 Interactive editor (recommended)"** for the best experience:

### Keyboard Shortcuts:
- **Type**: Real-time suggestions appear as you type
- **Tab**: Accept the highlighted suggestion
- **↑/↓ Arrow Keys**: Navigate through suggestions
- **←/→ Arrow Keys**: Move cursor within your query
- **Enter**: Execute the query
- **Escape**: Hide suggestions
- **Backspace**: Delete characters (suggestions update automatically)
- **Ctrl+C**: Cancel and return to menu

### Example Usage:
1. Type `SEL` → See `SELECT` suggestion
2. Press **Tab** → Completes to `SELECT`
3. Type ` * FR` → See `* FROM` suggestion
4. Press **Tab** → Completes to `SELECT * FROM`
5. Type ` us` → See table name suggestions like `users`
6. Press **Tab** → Completes to `SELECT * FROM users`

## 📝 Query Console Features

### 🎯 **Interactive Editor Mode**
```
SQLITE > SELECT * FROM users WHERE name LIKE 'John%'
         ↑ Real-time suggestions appear here ↑
  SELECT * FROM    INSERT INTO    UPDATE    DELETE FROM    CREATE TABLE
```

### 🔍 **Traditional Autocomplete**
- Dropdown-style selection
- Good for browsing available options
- Works well for discovering new SQL functions

### ⚡ **Quick Query Templates**
Choose from pre-built templates:
- **📋 Select all from table**: `SELECT * FROM table_name LIMIT 10;`
- **🔢 Count records**: `SELECT COUNT(*) FROM table_name;`
- **🔍 Find by condition**: `SELECT * FROM table_name WHERE column_name = 'value';`
- **📊 Group and count**: `SELECT column_name, COUNT(*) FROM table_name GROUP BY column_name;`
- **🔗 Inner join tables**: `SELECT * FROM table1 t1 INNER JOIN table2 t2 ON t1.id = t2.table1_id;`
- **➕ Insert record**: `INSERT INTO table_name (column1, column2) VALUES ('value1', 'value2');`
- **✏️ Update records**: `UPDATE table_name SET column_name = 'new_value' WHERE condition;`
- **❌ Delete records**: `DELETE FROM table_name WHERE condition;`

### 📜 **Smart Query History**
- Browse recent queries with preview
- Edit and re-run previous queries
- Search through query history
- Statistics tracking (success/failure rates)

## 🔧 Installation & Setup

```bash
# Clone the repository
git clone <repository-url>
cd db-manager-cli

# Install dependencies
npm install

# Build the project
npm run build

# Optional: Create global symlink
npm link
```

## 💾 Database Connections

### Add New Connection
```bash
npm run start connect
```

### Supported Databases:
- **MySQL**: Host, port, username, password, database
- **PostgreSQL**: Host, port, username, password, database, SSL support
- **SQLite**: Local file path
- **MongoDB**: Connection URI

### Example SQLite Setup:
```bash
# Create test database
sqlite3 test.db "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT);"
sqlite3 test.db "INSERT INTO users (name, email) VALUES ('John Doe', 'john@example.com');"

# Add connection via CLI
npm run start connect
# Select SQLite → Enter: ./test.db
```

## 🎮 Usage Examples

### Interactive Editor Session:
```bash
npm run start query

# Select your connection
# Choose "🎯 Interactive editor (recommended)"

# Start typing:
SQLITE > SEL[TAB] * FR[TAB] users WH[TAB] name LIKE 'John%'
#        ↑     ↑     ↑      ↑
#     SELECT  FROM  WHERE  Auto-completed as you type
```

### Quick Template Usage:
```bash
# Select "⚡ Quick query templates"
# Choose "📋 Select all from table"
# Customize: SELECT * FROM users LIMIT 5
```

## 🛠️ Development

### Project Structure
```
src/
├── commands/          # CLI command implementations
├── database/          # Database client implementations  
├── utils/
│   ├── interactive-editor.ts    # 🎯 NEW: Real-time editor
│   ├── autocomplete.ts          # Smart autocomplete provider
│   ├── query-input.ts           # Query input orchestrator
│   └── syntax-highlighter.ts   # SQL/MongoDB highlighting
└── types/             # TypeScript definitions
```

### Key Components:
- **InteractiveEditor**: Real-time editing with live suggestions
- **AutocompleteProvider**: Context-aware suggestion engine
- **QueryInput**: Orchestrates different input modes
- **SyntaxHighlighter**: Colorizes SQL and MongoDB queries

## 🔍 Troubleshooting

### Interactive Editor Issues:
- **Suggestions not appearing**: Ensure database connection is active
- **Tab not working**: Try using arrow keys to select, then Enter
- **Terminal display issues**: Try `FORCE_COLOR=1 npm run start query`

### Performance:
- Large result sets are limited to 50 rows for display
- Table names are cached for better autocomplete performance
- Query history is limited to recent 100 queries per connection

## 🎯 Pro Tips

1. **Start with Interactive Editor** - It provides the best experience
2. **Use Tab liberally** - It's the fastest way to complete suggestions
3. **Explore Quick Templates** - Great for learning SQL patterns
4. **Check Query History** - Reuse and modify previous successful queries
5. **Use Arrow Keys** - Navigate suggestions without losing your place

## 🚀 What's New

### v1.1.0 - Interactive Editor
- ✨ **Real-time interactive SQL editor**
- 🎯 **Tab completion** for keywords and table names
- 📝 **Live suggestions** as you type
- 🔄 **Smart word completion**
- ⌨️ **Full keyboard navigation**

## 📋 Roadmap

- [ ] **Multi-line interactive editing**
- [ ] **Syntax error highlighting**
- [x] **Query result export** (CSV, JSON)
- [ ] **Database schema visualization**
- [ ] **Custom query snippets**
- [ ] **Query performance analysis**

---

**Experience the future of database querying with real-time interactive editing!** 🎯 