import readline from 'readline';
import chalk from 'chalk';
import { AutocompleteProvider } from './autocomplete';

export interface InteractiveEditorOptions {
  prompt: string;
  dbType: string;
  autocompleteProvider?: AutocompleteProvider;
  multiline?: boolean;
}

export class InteractiveEditor {
  private rl?: readline.Interface;
  private currentInput: string = '';
  private suggestions: string[] = [];
  private selectedSuggestion: number = -1;
  private cursorPosition: number = 0;
  private showingSuggestions: boolean = false;
  private promptLength: number = 0;

  constructor(private options: InteractiveEditorOptions) {
    this.promptLength = this.options.prompt.length + 1; // +1 for space
  }

  async getInput(): Promise<string> {
    return new Promise((resolve, reject) => {
      // Setup readline interface
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: true
      });

      // Enable raw mode for precise key handling
      if (process.stdin.setRawMode) {
        process.stdin.setRawMode(true);
      }

      // Show cursor
      process.stdout.write('\x1B[?25h');
      
      // Display initial prompt
      this.displayPrompt();
      
      // Setup event handlers
      this.setupEventHandlers(resolve, reject);
      
      // Initialize suggestions
      this.updateSuggestions();
    });
  }

  private displayPrompt(): void {
    process.stdout.write(chalk.cyan(this.options.prompt + ' '));
  }

  private setupEventHandlers(resolve: (value: string) => void, reject: (error: Error) => void): void {
    if (!process.stdin) return;

    const keyHandler = (data: Buffer) => {
      try {
        this.handleKeyPress(data, resolve, reject);
      } catch (error) {
        this.cleanup();
        reject(error instanceof Error ? error : new Error('Unknown error'));
      }
    };

    process.stdin.on('data', keyHandler);

    // Handle process termination
    const cleanup = () => {
      process.stdin.removeListener('data', keyHandler);
      this.cleanup();
    };

    process.on('SIGINT', () => {
      cleanup();
      reject(new Error('User cancelled'));
    });

    process.on('SIGTERM', cleanup);
    process.on('exit', cleanup);
  }

  private handleKeyPress(data: Buffer, resolve: (value: string) => void, reject: (error: Error) => void): void {
    const key = data.toString();
    const keyCode = data[0];

    // Handle multi-byte sequences (arrow keys, etc.)
    if (data.length === 3 && data[0] === 27 && data[1] === 91) {
      this.handleArrowKeys(data[2]);
      return;
    }

    // Handle single byte keys
    switch (keyCode) {
      case 13: // Enter
        this.handleEnter(resolve);
        break;
      case 9: // Tab
        this.handleTab();
        break;
      case 27: // Escape
        this.handleEscape();
        break;
      case 3: // Ctrl+C
        this.cleanup();
        reject(new Error('User cancelled'));
        break;
      case 127: // Backspace
      case 8:   // Backspace (alternative)
        this.handleBackspace();
        break;
      case 4: // Ctrl+D (Delete)
        this.handleDelete();
        break;
      case 1: // Ctrl+A (Home)
        this.handleHome();
        break;
      case 5: // Ctrl+E (End)
        this.handleEnd();
        break;
      default:
        // Handle printable characters
        if (keyCode >= 32 && keyCode <= 126) {
          this.handlePrintableChar(key);
        }
        break;
    }
  }

  private handleArrowKeys(keyCode: number): void {
    switch (keyCode) {
      case 65: // Up arrow
        this.handleUpArrow();
        break;
      case 66: // Down arrow
        this.handleDownArrow();
        break;
      case 67: // Right arrow
        this.handleRightArrow();
        break;
      case 68: // Left arrow
        this.handleLeftArrow();
        break;
    }
  }

  private handleEnter(resolve: (value: string) => void): void {
    if (this.selectedSuggestion >= 0 && this.suggestions.length > 0) {
      // Accept suggestion and continue editing
      this.acceptSuggestion();
    } else {
      // Submit the query
      this.cleanup();
      resolve(this.currentInput.trim());
    }
  }

  private handleTab(): void {
    if (this.suggestions.length > 0) {
      if (this.selectedSuggestion < 0) {
        this.selectedSuggestion = 0;
      }
      this.acceptSuggestion();
    }
  }

  private handleEscape(): void {
    this.hideSuggestions();
  }

  private handleBackspace(): void {
    if (this.cursorPosition > 0) {
      this.currentInput = 
        this.currentInput.slice(0, this.cursorPosition - 1) + 
        this.currentInput.slice(this.cursorPosition);
      this.cursorPosition--;
      this.updateSuggestions();
      this.redrawInput();
    }
  }

  private handleDelete(): void {
    if (this.cursorPosition < this.currentInput.length) {
      this.currentInput = 
        this.currentInput.slice(0, this.cursorPosition) + 
        this.currentInput.slice(this.cursorPosition + 1);
      this.updateSuggestions();
      this.redrawInput();
    }
  }

  private handleHome(): void {
    this.cursorPosition = 0;
    this.redrawInput();
  }

  private handleEnd(): void {
    this.cursorPosition = this.currentInput.length;
    this.redrawInput();
  }

  private handleUpArrow(): void {
    if (this.suggestions.length > 0) {
      this.selectedSuggestion = this.selectedSuggestion <= 0 
        ? this.suggestions.length - 1 
        : this.selectedSuggestion - 1;
      this.redrawSuggestions();
    }
  }

  private handleDownArrow(): void {
    if (this.suggestions.length > 0) {
      this.selectedSuggestion = this.selectedSuggestion >= this.suggestions.length - 1 
        ? 0 
        : this.selectedSuggestion + 1;
      this.redrawSuggestions();
    }
  }

  private handleLeftArrow(): void {
    if (this.cursorPosition > 0) {
      this.cursorPosition--;
      this.redrawInput();
    }
  }

  private handleRightArrow(): void {
    if (this.cursorPosition < this.currentInput.length) {
      this.cursorPosition++;
      this.redrawInput();
    }
  }

  private handlePrintableChar(char: string): void {
    this.currentInput = 
      this.currentInput.slice(0, this.cursorPosition) + 
      char + 
      this.currentInput.slice(this.cursorPosition);
    this.cursorPosition++;
    this.updateSuggestions();
    this.redrawInput();
  }

  private updateSuggestions(): void {
    if (!this.options.autocompleteProvider) {
      this.suggestions = [];
      this.selectedSuggestion = -1;
      this.hideSuggestions();
      return;
    }

    const input = this.currentInput.trim();
    if (input.length === 0) {
      this.suggestions = this.options.autocompleteProvider.getQuickSuggestions();
    } else {
      this.suggestions = this.options.autocompleteProvider.getSuggestions(input);
    }

    // Auto-select first suggestion if available
    if (this.suggestions.length > 0) {
      this.selectedSuggestion = 0;
      this.redrawSuggestions();
    } else {
      this.selectedSuggestion = -1;
      this.hideSuggestions();
    }
  }

  private acceptSuggestion(): void {
    if (this.selectedSuggestion >= 0 && this.suggestions.length > 0) {
      const suggestion = this.suggestions[this.selectedSuggestion];
      
      // Get the current word being typed at cursor position
      const beforeCursor = this.currentInput.slice(0, this.cursorPosition);
      const afterCursor = this.currentInput.slice(this.cursorPosition);
      
      // Find the start of the current word
      const wordMatch = beforeCursor.match(/\S*$/);
      const currentPartialWord = wordMatch ? wordMatch[0] : '';
      const wordStartPos = beforeCursor.length - currentPartialWord.length;
      
      // Replace the partial word with the suggestion
      if (currentPartialWord && suggestion.toLowerCase().startsWith(currentPartialWord.toLowerCase())) {
        this.currentInput = 
          this.currentInput.slice(0, wordStartPos) + 
          suggestion + 
          afterCursor;
        this.cursorPosition = wordStartPos + suggestion.length;
      } else {
        // Insert suggestion at cursor position
        this.currentInput = beforeCursor + suggestion + afterCursor;
        this.cursorPosition = beforeCursor.length + suggestion.length;
      }
      
      // Add space after completion for better UX
      if (!this.currentInput.endsWith(' ') && this.cursorPosition === this.currentInput.length) {
        this.currentInput += ' ';
        this.cursorPosition++;
      }
      
      this.hideSuggestions();
      this.updateSuggestions();
      this.redrawInput();
    }
  }

  private redrawInput(): void {
    // Hide suggestions temporarily
    if (this.showingSuggestions) {
      this.clearSuggestionsLine();
    }

    // Clear current line and redraw
    process.stdout.write('\r\x1B[K');
    this.displayPrompt();
    process.stdout.write(this.currentInput);
    
    // Position cursor correctly
    const targetColumn = this.promptLength + this.cursorPosition;
    process.stdout.write(`\r\x1B[${targetColumn}G`);
    
    // Show cursor
    process.stdout.write('\x1B[?25h');

    // Redraw suggestions if they were showing
    if (this.suggestions.length > 0) {
      this.redrawSuggestions();
    }
  }

  private redrawSuggestions(): void {
    if (this.suggestions.length === 0) {
      this.hideSuggestions();
      return;
    }

    // Clear any existing suggestions
    this.clearSuggestionsLine();

    // Save current cursor position
    process.stdout.write('\x1B[s');
    
    // Move to next line
    process.stdout.write('\n');
    
    const maxSuggestions = Math.min(6, this.suggestions.length);
    
    // Show hint for first time users
    if (this.selectedSuggestion === 0 && this.suggestions.length > 0) {
      process.stdout.write(chalk.dim('Tab: complete, ↑↓: navigate: '));
    }
    
    // Display suggestions
    for (let i = 0; i < maxSuggestions; i++) {
      const suggestion = this.suggestions[i];
      const isSelected = i === this.selectedSuggestion;
      
      if (isSelected) {
        process.stdout.write(chalk.bgCyan.black(` ${suggestion} `));
      } else {
        process.stdout.write(chalk.dim(` ${suggestion} `));
      }
      
      if (i < maxSuggestions - 1) {
        process.stdout.write(' ');
      }
    }
    
    // Show count if there are more suggestions
    if (this.suggestions.length > maxSuggestions) {
      process.stdout.write(chalk.dim(` ... +${this.suggestions.length - maxSuggestions} more`));
    }
    
    // Restore cursor position
    process.stdout.write('\x1B[u');
    process.stdout.write('\x1B[?25h');
    
    this.showingSuggestions = true;
  }

  private hideSuggestions(): void {
    if (this.showingSuggestions) {
      this.clearSuggestionsLine();
      this.showingSuggestions = false;
    }
    this.selectedSuggestion = -1;
  }

  private clearSuggestionsLine(): void {
    if (this.showingSuggestions) {
      // Save cursor, move down, clear line, restore cursor
      process.stdout.write('\x1B[s\n\x1B[K\x1B[u');
    }
  }

  private cleanup(): void {
    // Clear suggestions if showing
    if (this.showingSuggestions) {
      this.clearSuggestionsLine();
    }
    
    // Show cursor
    process.stdout.write('\x1B[?25h');
    
    // Restore normal input mode
    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(false);
    }
    
    // Close readline interface
    if (this.rl) {
      this.rl.close();
      this.rl = undefined;
    }
    
    // Move to next line
    process.stdout.write('\n');
  }
} 