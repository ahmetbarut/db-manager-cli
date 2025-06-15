import readline from 'readline';
import chalk from 'chalk';

export interface BasicInputOptions {
  prompt: string;
  history?: string[];
}

export class BasicInput {
  async getInput(options: BasicInputOptions): Promise<string> {
    return new Promise((resolve, reject) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      rl.question(options.prompt, (answer) => {
        rl.close();
        resolve(answer.trim());
      });

      rl.on('SIGINT', () => {
        rl.close();
        reject(new Error('SIGINT'));
      });
    });
  }
}