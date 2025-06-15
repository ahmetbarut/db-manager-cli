import inquirer from 'inquirer';
import chalk from 'chalk';

export interface InquirerInputOptions {
  prompt: string;
  history: string[];
}

export class InquirerInput {
  async getInput(options: InquirerInputOptions): Promise<string> {
    const { query } = await inquirer.prompt([
      {
        type: 'input',
        name: 'query',
        message: options.prompt.replace(/\u001b\[[0-9;]*m/g, ''), // Strip ANSI codes from prompt
        validate: (input: string) => {
          const trimmed = input.trim();
          if (trimmed.length === 0) return 'Query cannot be empty';
          return true;
        }
      }
    ]);

    return query.trim();
  }
}