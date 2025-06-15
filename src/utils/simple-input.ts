import readline from 'readline';
import chalk from 'chalk';

export interface SimpleInputOptions {
  prompt: string;
  history: string[];
}

export class SimpleInput {
  private history: string[] = [];

  async getInput(options: SimpleInputOptions): Promise<string> {
    this.history = [...options.history];

    return new Promise((resolve, reject) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: true,
        historySize: 100
      });

      // Manually add history items to readline's internal history
      // We need to reverse the order because readline stores history in reverse
      const reversedHistory = [...this.history].reverse();
      reversedHistory.forEach(item => {
        (rl as any).history.unshift(item);
      });

      rl.question(options.prompt, (answer) => {
        rl.close();
        resolve(answer.trim());
      });

      rl.on('SIGINT', () => {
        rl.close();
        reject(new Error('SIGINT'));
      });

      // Handle cleanup
      rl.on('close', () => {
        // Cleanup is automatic
      });
    });
  }
}