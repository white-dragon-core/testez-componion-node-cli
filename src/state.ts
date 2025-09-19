import { Config } from './config';

export interface Place {
  name: string;
  id: number;
}

export class AppState {
  config: Config;
  places: Map<string, Place> = new Map();
  activePlace: string | null = null;
  onlyLogFailures: boolean;
  gameName: string | null = null;
  connectedPlaces: Set<string> = new Set();  // 记录已连接过的 place

  constructor(config: Config, onlyLogFailures: boolean = false) {
    this.config = config;
    this.onlyLogFailures = onlyLogFailures;
  }

  setActivePlace(placeGuid: string): void {
    this.activePlace = placeGuid;
  }

  getActivePlace(): string | null {
    return this.activePlace;
  }

  addPlace(guid: string, place: Place): void {
    this.places.set(guid, place);
  }

  getPlace(guid: string): Place | undefined {
    return this.places.get(guid);
  }

  getPlaces(): Map<string, Place> {
    return this.places;
  }
}