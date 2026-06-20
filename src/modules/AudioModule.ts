import { Howl, Howler } from 'howler';
import { GameStateManager } from '../core/GameStateManager';
import { eventBus } from '../utils/EventBus';

interface SfxTrack {
  id: string;
  name: string;
  path: string;
  volume: number;
  howl: Howl | null;
}

export class AudioModule {
  private static instance: AudioModule;
  private stateManager: GameStateManager;
  private sfxTracks: Map<string, SfxTrack> = new Map();

  private constructor() {
    this.stateManager = GameStateManager.getInstance();

    eventBus.on('settings:updated', this.onSettingsUpdated.bind(this));
    eventBus.on('star:discovered', () => this.playSfx('star_discover'));
    eventBus.on('constellation:discovered', () => this.playSfx('constellation_discover'));
    eventBus.on('constellation:success', () => this.playSfx('constellation_success'));
    eventBus.on('constellation:partial', () => this.playSfx('constellation_partial'));
    eventBus.on('constellation:error', () => this.playSfx('constellation_error'));
    eventBus.on('point:visited', () => this.playSfx('point_visit'));
    eventBus.on('route:started', () => this.playSfx('route_start'));
    eventBus.on('route:completed', () => this.playSfx('route_complete'));
    eventBus.on('objective:completed', () => this.playSfx('objective_complete'));
    eventBus.on('chapter:completed', () => this.playSfx('chapter_complete'));
  }

  public static getInstance(): AudioModule {
    if (!AudioModule.instance) {
      AudioModule.instance = new AudioModule();
    }
    return AudioModule.instance;
  }

  public initialize(): void {
    this.setupDefaultSounds();
    this.applyVolumeSettings();
  }

  private setupDefaultSounds(): void {
    this.registerSfx('star_discover', 'Star Discover', 'assets/audio/sfx/star_discover.mp3', 0.6);
    this.registerSfx('constellation_discover', 'Constellation Discover', 'assets/audio/sfx/constellation.mp3', 0.7);
    this.registerSfx('constellation_success', 'Constellation Success', 'assets/audio/sfx/constellation.mp3', 0.75);
    this.registerSfx('constellation_partial', 'Constellation Partial Match', 'assets/audio/sfx/button.mp3', 0.45);
    this.registerSfx('constellation_error', 'Constellation Error', 'assets/audio/sfx/storm.mp3', 0.4);
    this.registerSfx('point_visit', 'Point Visit', 'assets/audio/sfx/point.mp3', 0.5);
    this.registerSfx('route_start', 'Route Start', 'assets/audio/sfx/route_start.mp3', 0.5);
    this.registerSfx('route_complete', 'Route Complete', 'assets/audio/sfx/route_complete.mp3', 0.6);
    this.registerSfx('objective_complete', 'Objective Complete', 'assets/audio/sfx/objective.mp3', 0.6);
    this.registerSfx('chapter_complete', 'Chapter Complete', 'assets/audio/sfx/chapter.mp3', 0.8);
    this.registerSfx('button_click', 'Button Click', 'assets/audio/sfx/button.mp3', 0.4);
    this.registerSfx('storm', 'Storm', 'assets/audio/sfx/storm.mp3', 0.3);
    this.registerSfx('dialogue_appear', 'Dialogue Appear', 'assets/audio/sfx/dialogue_appear.mp3', 0.5);
    this.registerSfx('dialogue_next', 'Dialogue Next', 'assets/audio/sfx/dialogue_next.mp3', 0.35);
    this.registerSfx('dialogue_choice', 'Dialogue Choice', 'assets/audio/sfx/dialogue_choice.mp3', 0.45);
    this.registerSfx('dialogue_close', 'Dialogue Close', 'assets/audio/sfx/dialogue_close.mp3', 0.4);
    this.registerSfx('tutorial_step', 'Tutorial Step', 'assets/audio/sfx/dialogue_appear.mp3', 0.35);
    this.registerSfx('tutorial_complete', 'Tutorial Complete', 'assets/audio/sfx/objective_complete.mp3', 0.55);
    this.registerSfx('tutorial_click', 'Tutorial Click', 'assets/audio/sfx/dialogue_next.mp3', 0.3);
    this.registerSfx('event_trigger', 'Event Trigger', 'assets/audio/sfx/route_start.mp3', 0.5);
    this.registerSfx('warning', 'Warning', 'assets/audio/sfx/storm.mp3', 0.4);
    this.registerSfx('collision', 'Collision', 'assets/audio/sfx/storm.mp3', 0.5);
  }

  private registerSfx(id: string, name: string, path: string, baseVolume: number): void {
    this.sfxTracks.set(id, {
      id, name, path, volume: baseVolume, howl: null
    });
  }

  private createHowl(track: SfxTrack): Howl {
    const settings = this.stateManager.getState().settings;
    const volumeMultiplier = settings.masterVolume * settings.sfxVolume;

    const howl = new Howl({
      src: [track.path],
      loop: false,
      volume: track.volume * volumeMultiplier,
      preload: false,
      onloaderror: () => {
      }
    });

    const originalPlay = howl.play.bind(howl);
    howl.play = function(spriteOrId?: string | number) {
      try {
        return originalPlay(spriteOrId as any);
      } catch (_e) {
        return 0;
      }
    };

    return howl;
  }

  public playSfx(id: string): void {
    try {
      const track = this.sfxTracks.get(id);
      if (!track) return;

      if (!track.howl) {
        track.howl = this.createHowl(track);
      }

      track.howl.play();
    } catch (_e) {
    }
  }

  private onSettingsUpdated(): void {
    this.applyVolumeSettings();
  }

  private applyVolumeSettings(): void {
    const settings = this.stateManager.getState().settings;

    this.sfxTracks.forEach(track => {
      if (track.howl) {
        track.howl.volume(track.volume * settings.masterVolume * settings.sfxVolume);
      }
    });
  }

  public setMuted(muted: boolean): void {
    Howler.mute(muted);
  }

  public dispose(): void {
    [...this.sfxTracks.values()].forEach(track => {
      if (track.howl) {
        track.howl.unload();
      }
    });

    this.sfxTracks.clear();
  }
}
