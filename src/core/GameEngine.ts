import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { eventBus } from '../utils/EventBus';
import { GameState, GameSettings } from '../types';

export class GameEngine {
  private static instance: GameEngine;
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public controls: OrbitControls;
  public clock: THREE.Clock;
  
  private animationFrameId: number | null = null;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  
  private deltaTime: number = 0;
  private elapsedTime: number = 0;
  
  private updateCallbacks: Array<(delta: number, elapsed: number) => void> = [];

  private constructor(canvasId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.container = this.canvas.parentElement!;
    
    this.clock = new THREE.Clock();
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a);
    this.scene.fog = new THREE.FogExp2(0x0a0a1a, 0.008);
    
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 2000);
    this.camera.position.set(0, 80, 100);
    
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.minDistance = 20;
    this.controls.maxDistance = 300;
    this.controls.enablePan = false;
    
    this.setupLights();
    this.setupEventListeners();
  }

  public static getInstance(canvasId?: string): GameEngine {
    if (!GameEngine.instance) {
      if (canvasId) {
        GameEngine.instance = new GameEngine(canvasId);
      } else {
        throw new Error('GameEngine must be initialized with a canvas id first');
      }
    }
    return GameEngine.instance;
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.4);
    this.scene.add(ambientLight);
    
    const moonLight = new THREE.DirectionalLight(0xccccff, 0.6);
    moonLight.position.set(100, 150, 50);
    this.scene.add(moonLight);
    
    const starLight = new THREE.PointLight(0xffddaa, 0.8, 500);
    starLight.position.set(0, 100, 0);
    this.scene.add(starLight);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onResize.bind(this));
    
    this.controls.addEventListener('change', () => {
      eventBus.emit('camera:moved', {
        position: this.camera.position.clone(),
        target: this.controls.target.clone()
      });
    });
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  public start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.clock.start();
    this.animate();
    eventBus.emit('engine:started');
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.clock.stop();
    eventBus.emit('engine:stopped');
  }

  public pause(): void {
    this.isPaused = true;
    this.clock.stop();
    eventBus.emit('engine:paused');
  }

  public resume(): void {
    this.isPaused = false;
    this.clock.start();
    eventBus.emit('engine:resumed');
  }

  private animate(): void {
    if (!this.isRunning) return;
    
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
    
    if (!this.isPaused) {
      this.deltaTime = this.clock.getDelta();
      this.elapsedTime += this.deltaTime;
      
      this.controls.update();
      
      this.updateCallbacks.forEach(callback => {
        callback(this.deltaTime, this.elapsedTime);
      });
      
      eventBus.emit('engine:update', {
        delta: this.deltaTime,
        elapsed: this.elapsedTime
      });
    }
    
    this.renderer.render(this.scene, this.camera);
  }

  public onUpdate(callback: (delta: number, elapsed: number) => void): () => void {
    this.updateCallbacks.push(callback);
    return () => {
      const index = this.updateCallbacks.indexOf(callback);
      if (index > -1) {
        this.updateCallbacks.splice(index, 1);
      }
    };
  }

  public clearScene(): void {
    while(this.scene.children.length > 0) {
      const child = this.scene.children[0];
      this.scene.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
    this.setupLights();
  }

  public setCameraPosition(x: number, y: number, z: number): void {
    this.camera.position.set(x, y, z);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  public lookAt(x: number, y: number, z: number): void {
    this.controls.target.set(x, y, z);
    this.controls.update();
  }

  public getDeltaTime(): number {
    return this.deltaTime;
  }

  public getElapsedTime(): number {
    return this.elapsedTime;
  }

  public dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.onResize.bind(this));
    this.renderer.dispose();
    this.clearScene();
    GameEngine.instance = null as any;
  }
}
