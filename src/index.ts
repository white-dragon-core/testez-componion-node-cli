#!/usr/bin/env node

import express from 'express';
import { program } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import net from 'net';
import fs from 'fs/promises';
import path from 'path';
import { loadConfig } from './config';
import { AppState, Place } from './state';
import { createPollHandler, createLogsHandler, createResultsHandler } from './api';

const AVAILABLE_PORTS = [28900, 28901, 28902];
const WAIT_TIMEOUT = 5000;
const CHECK_INTERVAL = 100;

async function selectPlace(state: AppState): Promise<string> {
  const places = Array.from(state.getPlaces().entries());

  const choices = places.map(([guid, place]) => ({
    name: `${place.name} (${place.id}) [${guid}]`,
    value: guid
  }));

  const { selectedPlace } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedPlace',
      message: 'Select a place to run tests on:',
      choices
    }
  ]);

  return selectedPlace;
}

async function checkPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => {
      resolve(false);
    });
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port, '127.0.0.1');
  });
}

async function findAvailablePort(): Promise<number | null> {
  for (const port of AVAILABLE_PORTS) {
    if (await checkPortAvailable(port)) {
      return port;
    }
  }
  return null;
}

async function waitForPlaces(state: AppState, gameName: string | null): Promise<void> {
  const startTime = Date.now();

  console.error(chalk.dim('Waiting for place(s) to check in...'));
  if (gameName) {
    console.error(chalk.yellow(`Looking for game named: "${gameName}"`));
  }

  while (Date.now() - startTime < WAIT_TIMEOUT) {
    const places = state.getPlaces();

    if (places.size > 0) {
      let placeGuid: string | null = null;

      // If gameName is specified, find matching place
      if (gameName) {
        for (const [guid, place] of places.entries()) {
          if (place.name === gameName) {
            placeGuid = guid;
            break;
          }
        }
        if (!placeGuid) {
          // Wait for the specific game to connect
          await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
          continue;
        }
      } else {
        // No gameName specified, use existing logic
        if (places.size === 1) {
          const firstKey = places.keys().next();
          if (firstKey.done) continue;
          placeGuid = firstKey.value;
        } else {
          placeGuid = await selectPlace(state);
        }
      }

      console.error(chalk.dim(`Waiting for results from place ${placeGuid}...`));
      state.setActivePlace(placeGuid);
      return;
    }

    await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
  }

  console.error(chalk.red('No places have reported anything. Studio might not be open?'));
  process.exit(1);
}

async function main() {
  program
    .option('-g, --game-name <name>', 'Specify the game name to handle')
    .option('-r, --rojo-config <path>', 'Path to Rojo configuration JSON file', 'default.project.json')
    .option('-p, --paths <paths...>', 'Custom test paths (overrides config file)')
    .option('--only-print-failures', 'Only print test failures')
    .parse(process.argv);

  const options = program.opts();

  // Validate mutual exclusion of -g and -r
  if (options.gameName && options.rojoConfig && options.rojoConfig !== 'default.project.json') {
    console.error(chalk.red('Error: Cannot use both -g and -r options simultaneously.'));
    process.exit(1);
  }

  try {
    const config = await loadConfig();

    // Override test roots if custom paths are provided
    if (options.paths && options.paths.length > 0) {
      config.roots = options.paths;
    }

    let gameName: string | null = null;

    if (options.gameName) {
      // Use -g option directly
      gameName = options.gameName;
    } else if (options.rojoConfig) {
      // Read name from Rojo config file
      try {
        const rojoConfigPath = path.resolve(options.rojoConfig);
        const rojoConfigContent = await fs.readFile(rojoConfigPath, 'utf-8');
        const rojoConfig = JSON.parse(rojoConfigContent);

        if (rojoConfig.name) {
          gameName = rojoConfig.name;
          console.error(chalk.dim(`Using game name from Rojo config: "${gameName}"`));
        } else {
          console.error(chalk.yellow(`Warning: No 'name' field found in ${options.rojoConfig}`));
        }
      } catch (error) {
        if ((error as any).code === 'ENOENT') {
          console.error(chalk.red(`Error: Rojo config file not found: ${options.rojoConfig}`));
          process.exit(1);
        } else if (error instanceof SyntaxError) {
          console.error(chalk.red(`Error: Invalid JSON in Rojo config file: ${options.rojoConfig}`));
          process.exit(1);
        } else {
          console.error(chalk.red(`Error reading Rojo config file: ${error}`));
          process.exit(1);
        }
      }
    }

    const state = new AppState(config, options.onlyPrintFailures);
    state.gameName = gameName;

    const app = express();
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ limit: '50mb', extended: true }));

    app.get('/poll', createPollHandler(state));
    app.post('/logs', createLogsHandler());
    app.post('/results', createResultsHandler(state));

    // Find available port
    const port = await findAvailablePort();
    if (!port) {
      console.error(chalk.red('All ports (28900-28902) are in use. Please close other instances.'));
      process.exit(1);
    }

    const server = app.listen(port, '127.0.0.1', () => {
      console.error(chalk.dim(`Server listening on http://127.0.0.1:${port}`));
      if (gameName) {
        console.error(chalk.green(`Handling game: ${gameName}`));
      }
    });

    // Start checking for places
    setTimeout(() => waitForPlaces(state, gameName), 1000);

  } catch (error) {
    console.error(chalk.red(`Error: ${error}`));
    process.exit(1);
  }
}

main().catch(error => {
  console.error(chalk.red(`Fatal error: ${error}`));
  process.exit(1);
});