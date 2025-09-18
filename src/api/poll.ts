import { Request, Response } from 'express';
import { AppState, Place } from '../state';
import { ConfigResponse } from '../config';

export function createPollHandler(state: AppState) {
  return async (req: Request, res: Response) => {
    const placeGuid = req.headers['place-guid'] as string;
    const placeName = req.headers['place-name'] as string;
    const placeId = parseInt(req.headers['place-id'] as string, 10);
    const gameName = req.headers['game-name'] as string;

    console.log(`[Poll] Received request from game: ${gameName}, place: ${placeName}, guid: ${placeGuid}`);

    if (!placeGuid || !placeName || isNaN(placeId)) {
      console.log('[Poll] Invalid headers - missing required fields');
      return res.status(400).json({ error: 'Invalid headers' });
    }

    // If CLI is configured for a specific game, check if this is the right game
    if (state.gameName && gameName !== state.gameName) {
      console.log(`[Poll] Rejecting game "${gameName}" - expecting "${state.gameName}"`);
      return res.status(403).json({ error: 'This server is handling a different game' });
    }

    const place: Place = {
      name: placeName,
      id: placeId
    };

    const activePlace = state.getActivePlace();

    if (activePlace === placeGuid) {
      console.log(`[Poll] Sending test configuration to active place: ${placeGuid}`);
      const response: ConfigResponse = {
        testRoots: state.config.roots,
        testExtraOptions: state.config.test_extra_options || {}
      };
      return res.json(response);
    } else {
      console.log(`[Poll] Place ${placeGuid} added to waiting list`);
      state.addPlace(placeGuid, place);
      return res.status(403).send();
    }
  };
}