import { Request, Response } from 'express';
import chalk from 'chalk';
import { AppState } from '../state';
import { ReporterChildNode, ReporterOutput, ReporterStatus } from '../testez';

function printChildren(state: AppState, children: ReporterChildNode[], indent: number = 0): boolean {
  let success = true;

  for (const child of children) {
    if (state.onlyLogFailures && child.status !== ReporterStatus.Failure) {
      continue;
    }

    let styledPhrase: string;
    switch (child.status) {
      case ReporterStatus.Success:
        styledPhrase = chalk.green(`✓ ${child.planNode.phrase}`);
        break;
      case ReporterStatus.Failure:
        success = false;
        styledPhrase = chalk.red(`X ${child.planNode.phrase}`);
        break;
      case ReporterStatus.Skipped:
        styledPhrase = chalk.blue(`↪ ${child.planNode.phrase}`);
        break;
    }

    console.log(' '.repeat(indent) + styledPhrase);

    for (const error of child.errors) {
      const lines = error.split('\n');
      for (const line of lines) {
        console.log(' '.repeat(indent + 2) + line);
      }
    }

    if (!printChildren(state, child.children, indent + 2)) {
      success = false;
    }
  }

  return success;
}

export function createResultsHandler(state: AppState) {
  return async (req: Request, res: Response) => {
    const output: ReporterOutput = req.body;

    // Print top-level errors if any (e.g., path resolution errors)
    if (output.errors && output.errors.length > 0) {
      console.log(chalk.red('\nErrors:'));
      for (const error of output.errors) {
        const lines = error.split('\n');
        for (const line of lines) {
          console.log('  ' + chalk.red(line));
        }
      }
    }

    const success = printChildren(state, output.children);

    console.log();
    console.log(chalk.green('✓ Success:'), output.successCount);
    console.log(chalk.red('X Failure:'), output.failureCount);
    console.log(chalk.blue('↪ Skip:'), output.skippedCount);

    res.status(200).send();

    // Exit after a short delay to ensure response is sent
    setTimeout(() => {
      process.exit(success ? 0 : 1);
    }, 100);
  };
}