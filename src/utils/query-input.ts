import inquirer from 'inquirer';
import chalk from 'chalk';
import autocompletePrompt from 'inquirer-autocomplete-prompt';
import { highlightSQL, highlightMongoDB } from './syntax-highlighter';
import { AutocompleteProvider } from './autocomplete';
import { DatabaseClient } from '../database/factory';

// Register the autocomplete prompt
inquirer.registerPrompt('autocomplete', autocompletePrompt);

export interface QueryInputOptions {
  prompt: string;
  history: string[];
  dbType: string;
  client?: DatabaseClient;
}

export class QueryInput {
  private autocompleteProvider?: AutocompleteProvider;

  async getInput(options: QueryInputOptions): Promise<string> {
    // Initialize autocomplete provider
    if (options.client) {
      this.autocompleteProvider = new AutocompleteProvider(options.dbType, options.client);
      await this.autocompleteProvider.loadTableNames();
    }

    // Ana menü göster
    while (true) {
      const choice = await this.showMainMenu(options);
      
      if (choice === 'new') {
        const query = await this.getNewQuery(options);
        if (query && await this.confirmQuery(query, options.dbType)) {
          return query;
        }
      } else if (choice === 'autocomplete') {
        const query = await this.getAutocompleteQuery(options);
        if (query && await this.confirmQuery(query, options.dbType)) {
          return query;
        }
      } else if (choice === 'multiline') {
        const query = await this.getMultilineQuery();
        if (query && await this.confirmQuery(query, options.dbType)) {
          return query;
        }
      } else if (choice === 'history') {
        const query = await this.selectFromHistory(options);
        if (query && await this.confirmQuery(query, options.dbType)) {
          return query;
        }
      } else if (choice === 'quick') {
        const query = await this.selectQuickQuery(options);
        if (query && await this.confirmQuery(query, options.dbType)) {
          return query;
        }
      } else if (choice === 'exit') {
        throw new Error('User exit');
      }
    }
  }

  private async showMainMenu(options: QueryInputOptions): Promise<string> {
    const choices: any[] = [
      { name: '✏️  Write single line query', value: 'new' },
    ];

    // Add autocomplete option if available
    if (this.autocompleteProvider) {
      choices.push({ name: '🔍 Query with autocomplete', value: 'autocomplete' });
    }

    choices.push(
      { name: '📝 Write multi-line query', value: 'multiline' },
      { name: '⚡ Quick query templates', value: 'quick' }
    );

    if (options.history.length > 0) {
      choices.push({ name: '📜 Select from history', value: 'history' });
    }

    choices.push(
      new inquirer.Separator(),
      { name: '🚪 Exit console', value: 'exit' }
    );

    const { choice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: options.prompt,
        choices,
        pageSize: 12
      }
    ]);

    return choice;
  }

  private async getNewQuery(options: QueryInputOptions): Promise<string> {
    const { query } = await inquirer.prompt([
      {
        type: 'input',
        name: 'query',
        message: 'Enter your SQL query:',
        validate: (input: string) => {
          const trimmed = input.trim();
          if (trimmed.length === 0) return 'Query cannot be empty';
          return true;
        }
      }
    ]);

    return query.trim();
  }

  private async getAutocompleteQuery(options: QueryInputOptions): Promise<string> {
    if (!this.autocompleteProvider) {
      console.log(chalk.yellow('Autocomplete not available, falling back to regular input'));
      return this.getNewQuery(options);
    }

    console.log(chalk.cyan('\n🔍 Smart Query Builder'));
    console.log(chalk.gray('Start typing and suggestions will appear. Use arrow keys to navigate.'));
    console.log(chalk.gray('Press Tab to accept a suggestion, Enter to execute.\n'));

    const { query } = await inquirer.prompt([
      {
        type: 'autocomplete',
        name: 'query',
        message: `Enter ${options.dbType.toUpperCase()} query:`,
        source: async (answersSoFar: any, input: string) => {
          if (!input || input.length < 1) {
            return this.autocompleteProvider!.getQuickSuggestions();
          }
          return this.autocompleteProvider!.getSuggestions(input);
        },
        pageSize: 8,
        validate: (input: string) => {
          const trimmed = input.trim();
          if (trimmed.length === 0) return 'Query cannot be empty';
          return true;
        }
      }
    ]);

    return query.trim();
  }

  private async selectQuickQuery(options: QueryInputOptions): Promise<string> {
    const templates = this.getQueryTemplates(options.dbType);
    
    const { template } = await inquirer.prompt([
      {
        type: 'list',
        name: 'template',
        message: 'Select a query template:',
        choices: [
          ...templates.map(t => ({ name: t.name, value: t.query, short: t.name })),
          new inquirer.Separator(),
          { name: '🔙 Back to main menu', value: null }
        ],
        pageSize: 12
      }
    ]);

    if (!template) return '';

    // Allow user to customize the template
    const { customized } = await inquirer.prompt([
      {
        type: 'input',
        name: 'customized',
        message: 'Customize the query (or press Enter to use as-is):',
        default: template,
        validate: (input: string) => {
          const trimmed = input.trim();
          if (trimmed.length === 0) return 'Query cannot be empty';
          return true;
        }
      }
    ]);

    return customized.trim();
  }

  private getQueryTemplates(dbType: string) {
    const sqlTemplates = [
      { name: '📋 Select all from table', query: 'SELECT * FROM table_name LIMIT 10;' },
      { name: '🔢 Count records', query: 'SELECT COUNT(*) FROM table_name;' },
      { name: '🔍 Find by condition', query: 'SELECT * FROM table_name WHERE column_name = \'value\';' },
      { name: '📊 Group and count', query: 'SELECT column_name, COUNT(*) FROM table_name GROUP BY column_name;' },
      { name: '🔗 Inner join tables', query: 'SELECT * FROM table1 t1 INNER JOIN table2 t2 ON t1.id = t2.table1_id;' },
      { name: '➕ Insert record', query: 'INSERT INTO table_name (column1, column2) VALUES (\'value1\', \'value2\');' },
      { name: '✏️  Update records', query: 'UPDATE table_name SET column_name = \'new_value\' WHERE condition;' },
      { name: '❌ Delete records', query: 'DELETE FROM table_name WHERE condition;' },
      { name: '🏗️  Create table', query: 'CREATE TABLE table_name (\n  id INT PRIMARY KEY,\n  name VARCHAR(255) NOT NULL\n);' }
    ];

    const mongoTemplates = [
      { name: '📋 Find all documents', query: 'db.collection.find().limit(10)' },
      { name: '🔢 Count documents', query: 'db.collection.countDocuments()' },
      { name: '🔍 Find by condition', query: 'db.collection.find({ "field": "value" })' },
      { name: '📊 Aggregate data', query: 'db.collection.aggregate([\n  { $group: { _id: "$field", count: { $sum: 1 } } }\n])' },
      { name: '➕ Insert document', query: 'db.collection.insertOne({ "field1": "value1", "field2": "value2" })' },
      { name: '✏️  Update document', query: 'db.collection.updateOne({ "field": "value" }, { $set: { "field": "newValue" } })' },
      { name: '❌ Delete document', query: 'db.collection.deleteOne({ "field": "value" })' },
      { name: '🔗 Lookup (join)', query: 'db.collection.aggregate([\n  {\n    $lookup: {\n      from: "other_collection",\n      localField: "_id",\n      foreignField: "ref_id",\n      as: "joined_data"\n    }\n  }\n])' }
    ];

    return dbType === 'mongodb' ? mongoTemplates : sqlTemplates;
  }

  private async getMultilineQuery(): Promise<string> {
    console.log(chalk.cyan('\n📝 Multi-line Query Entry'));
    console.log(chalk.gray('Enter your query line by line. Type "END" on a new line when finished.'));
    console.log(chalk.gray('Type "CANCEL" to go back to main menu.\n'));

    const lines: string[] = [];
    let lineNumber = 1;

    while (true) {
      const { line } = await inquirer.prompt([
        {
          type: 'input',
          name: 'line',
          message: chalk.gray(`${lineNumber.toString().padStart(2, ' ')}:`),
        }
      ]);

      const trimmed = line.trim();
      
      if (trimmed.toUpperCase() === 'END') {
        break;
      } else if (trimmed.toUpperCase() === 'CANCEL') {
        return '';
      }

      lines.push(line);
      lineNumber++;

      // Show current query preview after every few lines
      if (lines.length > 0 && lines.length % 3 === 0) {
        console.log(chalk.gray('\nCurrent query preview:'));
        console.log(chalk.gray('─'.repeat(40)));
        console.log(lines.join('\n'));
        console.log(chalk.gray('─'.repeat(40)));
      }
    }

    const query = lines.join('\n').trim();
    if (query.length === 0) {
      console.log(chalk.yellow('Empty query, returning to menu...'));
      return '';
    }

    return query;
  }

  private async selectFromHistory(options: QueryInputOptions): Promise<string | null> {
    const historyChoices = options.history.slice(0, 15).map((query, index) => {
      const preview = this.truncateQuery(query);
      const lines = query.split('\n').length;
      const indicator = lines > 1 ? chalk.gray(` (${lines} lines)`) : '';
      
      return {
        name: `${(index + 1).toString().padStart(2, ' ')}. ${preview}${indicator}`,
        value: query,
        short: this.truncateQuery(query, 30)
      };
    });

    historyChoices.push(
      new inquirer.Separator() as any,
      { name: '🔙 Back to main menu', value: null as any, short: 'Back' }
    );

    const { selectedQuery } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedQuery',
        message: 'Select a query from history:',
        choices: historyChoices,
        pageSize: 12
      }
    ]);

    if (!selectedQuery) return null;

    // Show full query and ask what to do
    console.log(chalk.gray('\n📋 Selected Query:'));
    console.log(chalk.gray('─'.repeat(60)));
    console.log(this.highlightQuery(selectedQuery, options.dbType));
    console.log(chalk.gray('─'.repeat(60)));

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do with this query?',
        choices: [
          { name: '▶️  Execute as is', value: 'execute' },
          { name: '✏️  Edit query', value: 'edit' },
          { name: '🔙 Back to history', value: 'back' }
        ]
      }
    ]);

    if (action === 'execute') {
      return selectedQuery;
    } else if (action === 'edit') {
      return await this.editQuery(selectedQuery);
    } else {
      return await this.selectFromHistory(options);
    }
  }

  private async editQuery(originalQuery: string): Promise<string> {
    const lines = originalQuery.split('\n');
    
    if (lines.length === 1) {
      // Single line edit
      const { editedQuery } = await inquirer.prompt([
        {
          type: 'input',
          name: 'editedQuery',
          message: 'Edit your query:',
          default: originalQuery,
          validate: (input: string) => {
            const trimmed = input.trim();
            if (trimmed.length === 0) return 'Query cannot be empty';
            return true;
          }
        }
      ]);
      return editedQuery.trim();
    } else {
      // Multi-line edit
      console.log(chalk.cyan('\n✏️  Multi-line Query Edit'));
      console.log(chalk.gray('Current query:'));
      console.log(chalk.gray('─'.repeat(40)));
      lines.forEach((line, index) => {
        console.log(chalk.gray(`${(index + 1).toString().padStart(2, ' ')}:`), line);
      });
      console.log(chalk.gray('─'.repeat(40)));

      const { editChoice } = await inquirer.prompt([
        {
          type: 'list',
          name: 'editChoice',
          message: 'How would you like to edit?',
          choices: [
            { name: '✏️  Edit line by line', value: 'line' },
            { name: '📝 Rewrite completely', value: 'rewrite' },
            { name: '❌ Cancel edit', value: 'cancel' }
          ]
        }
      ]);

      if (editChoice === 'cancel') {
        return originalQuery;
      } else if (editChoice === 'rewrite') {
        return await this.getMultilineQuery();
      } else {
        return await this.editLineByLine(lines);
      }
    }
  }

  private async editLineByLine(originalLines: string[]): Promise<string> {
    console.log(chalk.cyan('\n📝 Line-by-Line Edit'));
    console.log(chalk.gray('Press Enter to keep line unchanged, or type new content.'));
    console.log(chalk.gray('Type "DELETE" to remove a line.\n'));

    const newLines: string[] = [];

    for (let i = 0; i < originalLines.length; i++) {
      const currentLine = originalLines[i];
      console.log(chalk.gray(`Original line ${i + 1}:`), currentLine);
      
      const { newLine } = await inquirer.prompt([
        {
          type: 'input',
          name: 'newLine',
          message: chalk.cyan(`Line ${i + 1}:`),
          default: currentLine
        }
      ]);

      if (newLine.trim().toUpperCase() !== 'DELETE') {
        newLines.push(newLine);
      }
    }

    // Ask if want to add more lines
    const { addMore } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'addMore',
        message: 'Add more lines?',
        default: false
      }
    ]);

    if (addMore) {
      let lineNumber = newLines.length + 1;
      console.log(chalk.gray('Type "END" to finish adding lines.'));
      
      while (true) {
        const { line } = await inquirer.prompt([
          {
            type: 'input',
            name: 'line',
            message: chalk.cyan(`Line ${lineNumber}:`),
          }
        ]);

        if (line.trim().toUpperCase() === 'END') {
          break;
        }

        newLines.push(line);
        lineNumber++;
      }
    }

    return newLines.join('\n').trim();
  }

  private async confirmQuery(query: string, dbType: string): Promise<boolean> {
    console.log(chalk.cyan.bold('\n🔍 Query Preview:'));
    console.log(chalk.gray('═'.repeat(80)));
    console.log(this.highlightQuery(query, dbType));
    console.log(chalk.gray('═'.repeat(80)));

    // Show query statistics
    const lines = query.split('\n').length;
    const chars = query.length;
    const words = query.split(/\s+/).filter(w => w.length > 0).length;
    
    console.log(chalk.gray(`📊 Stats: ${lines} lines, ${words} words, ${chars} characters`));

    const { confirm } = await inquirer.prompt([
      {
        type: 'list',
        name: 'confirm',
        message: 'Execute this query?',
        choices: [
          { name: '✅ Yes, execute query', value: true },
          { name: '✏️  Edit query again', value: 'edit' },
          { name: '❌ Cancel and go back', value: false }
        ]
      }
    ]);

    if (confirm === 'edit') {
      const editedQuery = await this.editQuery(query);
      return await this.confirmQuery(editedQuery, dbType);
    }

    return confirm === true;
  }

  private highlightQuery(query: string, dbType: string): string {
    try {
      return dbType === 'mongodb' ? highlightMongoDB(query) : highlightSQL(query);
    } catch {
      return query;
    }
  }

  private truncateQuery(query: string, maxLength: number = 70): string {
    const singleLine = query.replace(/\s+/g, ' ').trim();
    return singleLine.length > maxLength 
      ? singleLine.substring(0, maxLength - 3) + '...'
      : singleLine;
  }
}