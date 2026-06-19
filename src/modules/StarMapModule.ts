import * as THREE from 'three';
import { GameEngine } from '../core/GameEngine';
import { GameStateManager } from '../core/GameStateManager';
import { eventBus } from '../utils/EventBus';
import { MathUtils } from '../utils/MathUtils';
import { Star, Constellation } from '../types';
import { DayNightCycleModule } from './DayNightCycleModule';

export class StarMapModule {
  private engine: GameEngine;
  private stateManager: GameStateManager;
  private stars: Map<string, THREE.Mesh> = new Map();
  private constellationLines: Map<string, THREE.Line> = new Map();
  private starGroup: THREE.Group;
  private constellationGroup: THREE.Group;
  private backgroundStars: THREE.Points | null = null;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private hoveredStar: string | null = null;
  private selectedStars: string[] = [];
  private connectingMode: boolean = false;
  private dayNightModule: DayNightCycleModule;
  private dayNightStarBrightness: number = 1.0;

  constructor() {
    this.engine = GameEngine.getInstance();
    this.stateManager = GameStateManager.getInstance();
    this.dayNightModule = DayNightCycleModule.getInstance();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    this.starGroup = new THREE.Group();
    this.starGroup.name = 'stars';
    this.constellationGroup = new THREE.Group();
    this.constellationGroup.name = 'constellations';
    
    this.engine.scene.add(this.starGroup);
    this.engine.scene.add(this.constellationGroup);
    
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('click', this.onClick.bind(this));
    window.addEventListener('touchstart', this.onTouch.bind(this));
    
    this.engine.onUpdate((delta) => {
      this.animateStars(delta);
    });
    
    eventBus.on('weather:changed', this.onWeatherChanged.bind(this));
    eventBus.on('daynight:tick', this.onDayNightTick.bind(this));
  }

  public loadChapterStars(stars: Star[], constellations: Constellation[]): void {
    this.clearStars();
    this.createBackgroundStars(stars.length * 3);
    this.createStars(stars);
    this.createConstellationLines(constellations);
  }

  private createStars(stars: Star[]): void {
    const starGeometry = new THREE.SphereGeometry(1, 16, 16);
    
    stars.forEach(star => {
      const starMaterial = new THREE.MeshBasicMaterial({
        color: star.color,
        transparent: true,
        opacity: star.brightness
      });
      
      const starMesh = new THREE.Mesh(starGeometry, starMaterial);
      starMesh.position.set(
        star.position.x,
        star.position.y,
        star.position.z
      );
      starMesh.scale.setScalar(star.size);
      starMesh.userData = { starId: star.id, isClickable: star.isClickable };
      
      const glowGeometry = new THREE.SphereGeometry(1.5, 16, 16);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: star.color,
        transparent: true,
        opacity: 0.3
      });
      const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
      starMesh.add(glowMesh);
      
      this.stars.set(star.id, starMesh);
      this.starGroup.add(starMesh);
      
      if (!this.stateManager.isStarDiscovered(star.id)) {
        starMaterial.opacity = 0.1;
      }
    });
  }

  private createBackgroundStars(count: number): void {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    
    const color = new THREE.Color();
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const radius = MathUtils.randomRange(80, 200);
      const theta = MathUtils.randomRange(0, Math.PI * 2);
      const phi = MathUtils.randomRange(0, Math.PI);
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);
      
      const brightness = MathUtils.randomRange(0.3, 1);
      color.setHSL(0.15, 0.2, 0.5 + brightness * 0.5);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
      
      sizes[i] = MathUtils.randomRange(0.5, 1.5);
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        opacityMultiplier: { value: 1.0 }
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float time;
        uniform float opacityMultiplier;
        void main() {
          vColor = color;
          float twinkle = sin(time * 2.0 + position.x * 0.1) * 0.3 + 0.7;
          vAlpha = twinkle * opacityMultiplier;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z) * twinkle;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = (1.0 - smoothstep(0.0, 0.5, dist)) * vAlpha;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending
    });
    
    this.backgroundStars = new THREE.Points(geometry, material);
    this.engine.scene.add(this.backgroundStars);
  }

  private createConstellationLines(constellations: Constellation[]): void {
    constellations.forEach(constellation => {
      const points: THREE.Vector3[] = [];
      
      constellation.connections.forEach(([startIdx, endIdx]) => {
        const startStar = this.stars.get(constellation.stars[startIdx]);
        const endStar = this.stars.get(constellation.stars[endIdx]);
        
        if (startStar && endStar) {
          points.push(startStar.position.clone());
          points.push(endStar.position.clone());
        }
      });
      
      if (points.length > 0) {
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
          color: 0xd4af37,
          transparent: true,
          opacity: 0
        });
        
        const line = new THREE.LineSegments(geometry, material);
        this.constellationLines.set(constellation.id, line);
        this.constellationGroup.add(line);
      }
    });
  }

  private onMouseMove(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    this.checkHover();
  }

  private onTouch(event: TouchEvent): void {
    if (event.touches.length > 0) {
      const touch = event.touches[0];
      this.mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
      
      this.checkHover();
    }
  }

  private checkHover(): void {
    this.raycaster.setFromCamera(this.mouse, this.engine.camera);
    
    const starMeshes = Array.from(this.stars.values()).filter(s => s.userData.isClickable);
    const intersects = this.raycaster.intersectObjects(starMeshes);
    
    if (this.hoveredStar) {
      const prevStar = this.stars.get(this.hoveredStar);
      if (prevStar && !this.selectedStars.includes(this.hoveredStar)) {
        prevStar.scale.setScalar(prevStar.userData.originalScale || 1);
      }
      this.hoveredStar = null;
      document.body.style.cursor = 'default';
    }
    
    if (intersects.length > 0) {
      const starMesh = intersects[0].object as THREE.Mesh;
      const starId = starMesh.userData.starId;
      
      if (this.stateManager.isStarDiscovered(starId)) {
        this.hoveredStar = starId;
        starMesh.userData.originalScale = starMesh.userData.originalScale || starMesh.scale.x;
        starMesh.scale.setScalar(starMesh.userData.originalScale * 1.5);
        document.body.style.cursor = 'pointer';
        
        eventBus.emit('star:hover', starId);
      }
    }
  }

  private onClick(event: MouseEvent): void {
    if (event.button !== 0) return;
    
    this.raycaster.setFromCamera(this.mouse, this.engine.camera);
    
    const starMeshes = Array.from(this.stars.values()).filter(s => s.userData.isClickable);
    const intersects = this.raycaster.intersectObjects(starMeshes);
    
    if (intersects.length > 0) {
      const starMesh = intersects[0].object as THREE.Mesh;
      const starId = starMesh.userData.starId;
      
      if (!this.stateManager.isStarDiscovered(starId)) {
        this.discoverStar(starId);
      } else if (this.connectingMode) {
        this.handleStarConnection(starId);
      } else {
          this.selectStar(starId);
      }
    }
  }

  private discoverStar(starId: string): void {
    const starMesh = this.stars.get(starId);
    if (starMesh) {
      const material = starMesh.material as THREE.MeshBasicMaterial;
      this.animateStarDiscovery(starMesh, material);
      this.stateManager.addDiscoveredStar(starId);
      eventBus.emit('toast:show', { message: '发现新星！' });
    }
  }

  private animateStarDiscovery(starMesh: THREE.Mesh, material: THREE.MeshBasicMaterial): void {
    const duration = 1;
    let elapsed = 0;
    
    const animate = () => {
      elapsed += this.engine.getDeltaTime();
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = MathUtils.easeInOutCubic(progress);
      
      material.opacity = 0.2 + easeProgress * 0.8;
      starMesh.scale.setScalar(1 + Math.sin(progress * Math.PI) * 0.5);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }

  private selectStar(starId: string): void {
    eventBus.emit('star:clicked', starId);
  }

  private handleStarConnection(starId: string): void {
    const index = this.selectedStars.indexOf(starId);
    
    if (index > -1) {
      this.selectedStars.splice(index, 1);
      const starMesh = this.stars.get(starId);
      if (starMesh) {
        starMesh.scale.setScalar(starMesh.userData.originalScale || 1);
      }
    } else {
      this.selectedStars.push(starId);
      const starMesh = this.stars.get(starId);
      if (starMesh) {
        starMesh.scale.setScalar((starMesh.userData.originalScale || 1) * 1.3);
      }
      
      if (this.selectedStars.length >= 2) {
        eventBus.emit('stars:connected', [...this.selectedStars]);
        this.selectedStars = [];
      }
    }
    
    eventBus.emit('selectedStars:changed', this.selectedStars);
  }

  public showConstellation(constellationId: string): void {
    const line = this.constellationLines.get(constellationId);
    if (line) {
      const material = line.material as THREE.LineBasicMaterial;
      this.animateConstellationReveal(line, material);
      this.stateManager.addDiscoveredConstellation(constellationId);
    }
  }

  private animateConstellationReveal(line: THREE.Line, material: THREE.LineBasicMaterial): void {
    const duration = 2;
    let elapsed = 0;
    
    const animate = () => {
      elapsed += this.engine.getDeltaTime();
      const progress = Math.min(elapsed / duration, 1);
      
      material.opacity = progress * 0.6;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }

  private animateStars(delta: number): void {
    const time = this.engine.getElapsedTime();
    
    this.stars.forEach((starMesh, starId) => {
      const twinkle = Math.sin(time * 2 + starMesh.position.x * 0.1 + starMesh.position.z * 0.1);
      const material = starMesh.material as THREE.MeshBasicMaterial;
      
      if (this.stateManager.isStarDiscovered(starId)) {
        material.opacity = (0.6 + twinkle * 0.3) * this.dayNightStarBrightness;
      }
      
      const glowMesh = starMesh.children[0] as THREE.Mesh;
      if (glowMesh) {
        const glowMaterial = glowMesh.material as THREE.MeshBasicMaterial;
        glowMaterial.opacity = (0.2 + Math.abs(twinkle) * 0.2) * this.dayNightStarBrightness;
      }
    });
    
    if (this.backgroundStars) {
      const material = this.backgroundStars.material as THREE.ShaderMaterial;
      material.uniforms.time.value = time;
    }
  }

  private onWeatherChanged(weather: any): void {
    const starVisibility = weather?.effects?.starVisibility ?? 1;
    
    this.stars.forEach((starMesh) => {
      const material = starMesh.material as THREE.MeshBasicMaterial;
      if (this.stateManager.isStarDiscovered(starMesh.userData.starId)) {
        material.opacity = Math.max(0.1, material.opacity * starVisibility);
      }
    });
    
    if (this.backgroundStars) {
      this.backgroundStars.visible = starVisibility > 0.3;
    }
  }

  private onDayNightTick(_data: any): void {
    const vis = this.dayNightModule.getStarVisibility();
    this.dayNightStarBrightness = vis.starBrightness;

    if (this.backgroundStars) {
      const material = this.backgroundStars.material as THREE.ShaderMaterial;
      material.uniforms.opacityMultiplier = material.uniforms.opacityMultiplier || { value: 1.0 };
      material.uniforms.opacityMultiplier.value = vis.backgroundStarOpacity;
      this.backgroundStars.visible = vis.backgroundStarOpacity > 0.05;
    }

    this.constellationLines.forEach((line) => {
      const material = line.material as THREE.LineBasicMaterial;
      material.opacity = vis.constellationLineOpacity * 0.6;
    });
  }

  public setConnectingMode(enabled: boolean): void {
    this.connectingMode = enabled;
    if (!enabled) {
      this.selectedStars.forEach(starId => {
        const starMesh = this.stars.get(starId);
        if (starMesh) {
          starMesh.scale.setScalar(starMesh.userData.originalScale || 1);
        }
      });
      this.selectedStars = [];
    }
  }

  public getStarPosition(starId: string): THREE.Vector3 | null {
    const star = this.stars.get(starId);
    return star ? star.position.clone() : null;
  }

  public clearStars(): void {
    this.stars.forEach(star => {
      star.geometry.dispose();
      (star.material as THREE.Material).dispose();
    });
    this.stars.clear();
    
    this.constellationLines.forEach(line => {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    });
    this.constellationLines.clear();
    
    while (this.starGroup.children.length > 0) {
      this.starGroup.remove(this.starGroup.children[0]);
    }
    
    while (this.constellationGroup.children.length > 0) {
      this.constellationGroup.remove(this.constellationGroup.children[0]);
    }
    
    if (this.backgroundStars) {
      this.backgroundStars.geometry.dispose();
      (this.backgroundStars.material as THREE.Material).dispose();
      this.engine.scene.remove(this.backgroundStars);
      this.backgroundStars = null;
    }
  }

  public dispose(): void {
    window.removeEventListener('mousemove', this.onMouseMove.bind(this));
    window.removeEventListener('click', this.onClick.bind(this));
    window.removeEventListener('touchstart', this.onTouch.bind(this));
    this.clearStars();
  }
}
