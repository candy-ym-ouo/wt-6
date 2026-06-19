import { Howl, Howler } from 'howler';
import { GameStateManager } from '../core/GameStateManager';
import { eventBus } from '../utils/EventBus';

interface SoundTrack {
  id: string;
  name: string;
  path: string;
  volume: number;
  loop: boolean;
  howl: Howl | null;
}

export class AudioModule {
  private static instance: AudioModule;
  private stateManager: GameStateManager;
  private musicTracks: Map<string, SoundTrack> = new Map();
  private sfxTracks: Map<string, SoundTrack> = new Map();
  private ambientTracks: Map<string, SoundTrack> = new Map();
  private currentMusic: string | null = null;
  private currentAmbient: string | null = null;

  private constructor() {
    this.stateManager = GameStateManager.getInstance();
    
    eventBus.on('settings:updated', this.onSettingsUpdated.bind(this));
    eventBus.on('star:discovered', () => this.playSfx('star_discover'));
    eventBus.on('constellation:discovered', () => this.playSfx('constellation_discover'));
    eventBus.on('point:visited', () => this.playSfx('point_visit'));
    eventBus.on('weather:changed', this.onWeatherChanged.bind(this));
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
    this.registerMusic('menu', 'Menu Theme', 'assets/audio/music/menu.mp3', 0.5);
    this.registerMusic('game', 'Game Theme', 'assets/audio/music/game.mp3', 0.4);
    this.registerMusic('exploration', 'Exploration', 'assets/audio/music/exploration.mp3', 0.3);
    
    this.registerSfx('star_discover', 'Star Discover', 'assets/audio/sfx/star_discover.mp3', 0.6);
    this.registerSfx('constellation_discover', 'Constellation Discover', 'assets/audio/sfx/constellation.mp3', 0.7);
    this.registerSfx('point_visit', 'Point Visit', 'assets/audio/sfx/point.mp3', 0.5);
    this.registerSfx('route_start', 'Route Start', 'assets/audio/sfx/route_start.mp3', 0.5);
    this.registerSfx('route_complete', 'Route Complete', 'assets/audio/sfx/route_complete.mp3', 0.6);
    this.registerSfx('objective_complete', 'Objective Complete', 'assets/audio/sfx/objective.mp3', 0.6);
    this.registerSfx('chapter_complete', 'Chapter Complete', 'assets/audio/sfx/chapter.mp3', 0.8);
    this.registerSfx('button_click', 'Button Click', 'assets/audio/sfx/button.mp3', 0.4);
    this.registerSfx('storm', 'Storm', 'assets/audio/sfx/storm.mp3', 0.3);
    
    this.registerAmbient('ocean', 'Ocean Waves', 'assets/audio/ambient/ocean.mp3', 0.3);
    this.registerAmbient('night', 'Night Crickets', 'assets/audio/ambient/night.mp3', 0.2);
    this.registerAmbient('wind', 'Wind', 'assets/audio/ambient/wind.mp3', 0.25);
  }

  private registerMusic(id: string, name: string, path: string, baseVolume: number): void {
    this.musicTracks.set(id, {
      id, name, path, volume: baseVolume, loop: true, howl: null
    });
  }

  private registerSfx(id: string, name: string, path: string, baseVolume: number): void {
    this.sfxTracks.set(id, {
      id, name, path, volume: baseVolume, loop: false, howl: null
    });
  }

  private registerAmbient(id: string, name: string, path: string, baseVolume: number): void {
    this.ambientTracks.set(id, {
      id, name, path, volume: baseVolume, loop: true, howl: null
    });
  }

  private createHowl(track: SoundTrack): Howl {
    const settings = this.stateManager.getState().settings;
    let volumeMultiplier = settings.masterVolume;
    
    if (this.musicTracks.has(track.id)) {
      volumeMultiplier *= settings.musicVolume;
    } else if (this.sfxTracks.has(track.id)) {
      volumeMultiplier *= settings.sfxVolume;
    } else if (this.ambientTracks.has(track.id)) {
      volumeMultiplier *= settings.ambientVolume;
    }
    
    const howl = new Howl({
      src: [track.path],
      loop: track.loop,
      volume: track.volume * volumeMultiplier,
      preload: false,
      onloaderror: (_id, _error) => {
        // 静默处理音频文件缺失，不影响游戏运行
      }
    });

    Object.defineProperty(howl, '_isSilent', {
      value: false,
      writable: true,
      configurable: true,
      enumerable: false
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

  public playMusic(id: string): void {
    try {
      if (this.currentMusic === id) return;
      
      this.stopMusic();
      
      const track = this.musicTracks.get(id);
      if (!track) return;
      
      if (!track.howl) {
        track.howl = this.createHowl(track);
      }
      
      track.howl.play();
      this.currentMusic = id;
    } catch (_e) {
      // 静默处理音乐播放错误
    }
  }

  public stopMusic(): void {
    if (this.currentMusic) {
      const track = this.musicTracks.get(this.currentMusic);
      if (track?.howl) {
        track.howl.fade(track.howl.volume(), 0, 1000);
        setTimeout(() => {
          if (track.howl) {
            track.howl.stop();
          }
        }, 1000);
      }
      this.currentMusic = null;
    }
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
      // 静默处理音效播放错误
    }
  }

  public playAmbient(id: string): void {
    try {
      if (this.currentAmbient === id) return;
      
      this.stopAmbient();
      
      const track = this.ambientTracks.get(id);
      if (!track) return;
      
      if (!track.howl) {
        track.howl = this.createHowl(track);
      }
      
      track.howl.play();
      this.currentAmbient = id;
    } catch (_e) {
      // 静默处理环境音播放错误
    }
  }

  public stopAmbient(): void {
    if (this.currentAmbient) {
      const track = this.ambientTracks.get(this.currentAmbient);
      if (track?.howl) {
        track.howl.fade(track.howl.volume(), 0, 1000);
        setTimeout(() => {
          if (track.howl) {
            track.howl.stop();
          }
        }, 1000);
      }
      this.currentAmbient = null;
    }
  }

  private onSettingsUpdated(): void {
    this.applyVolumeSettings();
  }

  private applyVolumeSettings(): void {
    const settings = this.stateManager.getState().settings;
    
    this.musicTracks.forEach(track => {
      if (track.howl) {
        track.howl.volume(track.volume * settings.masterVolume * settings.musicVolume);
      }
    });
    
    this.sfxTracks.forEach(track => {
      if (track.howl) {
        track.howl.volume(track.volume * settings.masterVolume * settings.sfxVolume);
      }
    });
    
    this.ambientTracks.forEach(track => {
      if (track.howl) {
        track.howl.volume(track.volume * settings.masterVolume * settings.ambientVolume);
      }
    });
  }

  private onWeatherChanged(weather: any): void {
    if (weather?.id.includes('storm')) {
      this.playSfx('storm');
    }
  }

  public setMuted(muted: boolean): void {
    Howler.mute(muted);
  }

  public dispose(): void {
    this.stopMusic();
    this.stopAmbient();
    
    [...this.musicTracks.values(), ...this.sfxTracks.values(), ...this.ambientTracks.values()].forEach(track => {
      if (track.howl) {
        track.howl.unload();
      }
    });
    
    this.musicTracks.clear();
    this.sfxTracks.clear();
    this.ambientTracks.clear();
  }
}
