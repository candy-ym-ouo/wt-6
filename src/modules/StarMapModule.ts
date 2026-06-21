import * as THREE from 'three';
import { GameEngine } from '../core/GameEngine';
import { GameStateManager } from '../core/GameStateManager';
import { eventBus } from '../utils/EventBus';
import { MathUtils } from '../utils/MathUtils';
import { Star, Constellation, ConstellationMatchResult, Chapter } from '../types';
import { DayNightCycleModule } from './DayNightCycleModule';
import { ConstellationStoryModule } from './ConstellationStoryModule';

export class StarMapModule {
  private engine: GameEngine;
  private stateManager: GameStateManager;
  private storyModule: ConstellationStoryModule;
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
  private tempConnectionLine: THREE.Line | null = null;
  private tempConnectionGroup: THREE.Group;
  private highlightLines: Map<string, THREE.Line> = new Map();
  private starOriginalColors: Map<string, THREE.Color> = new Map();
  private starAnimating: Set<string> = new Set();
  private currentStars: Star[] = [];
  private currentConstellations: Constellation[] = [];
  private currentChapter: Chapter | null = null;

  private isStarmapDistorted: boolean = false;
  private starmapDistortUntil: number = 0;
  private starOriginalPositions: Map<string, THREE.Vector3> = new Map();
  private starRevealedTemporarily: Set<string> = new Set();

  constructor() {
    this.engine = GameEngine.getInstance();
    this.stateManager = GameStateManager.getInstance();
    this.storyModule = ConstellationStoryModule.getInstance();
    this.dayNightModule = DayNightCycleModule.getInstance();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    this.starGroup = new THREE.Group();
    this.starGroup.name = 'stars';
    this.constellationGroup = new THREE.Group();
    this.constellationGroup.name = 'constellations';
    this.tempConnectionGroup = new THREE.Group();
    this.tempConnectionGroup.name = 'tempConnections';
    
    this.engine.scene.add(this.starGroup);
    this.engine.scene.add(this.constellationGroup);
    this.engine.scene.add(this.tempConnectionGroup);
    
    this.setupEventListeners();
    this.setupConnectionEventListeners();
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

    eventBus.on('voyageevent:starmap_distort', (data: { duration?: number }) => {
      this.startStarmapDistortion(data.duration || 30000);
    });

    eventBus.on('voyageevent:starmap_clarify', () => {
      this.stopStarmapDistortion();
    });

    eventBus.on('voyageevent:reveal_stars', (data?: { count?: number; permanent?: boolean }) => {
      this.revealRandomStars(data?.count || 2, data?.permanent ?? false);
    });
  }

  private setupConnectionEventListeners(): void {
    eventBus.on('constellation:success', (data: { constellationId: string; constellationName?: string }) => {
      this.onConstellationSuccess(data.constellationId);
    });

    eventBus.on('constellation:partial', (data: { constellationId: string; constellationName: string; matchedCount: number; totalCount: number; missingStarIds: string[] }) => {
      this.onConstellationPartial(data.constellationId, data.missingStarIds);
    });

    eventBus.on('constellation:error', (data: { starIds: string[]; bestMatch?: ConstellationMatchResult }) => {
      this.onConstellationError(data.starIds, data.bestMatch);
    });
  }

  public loadChapterStars(stars: Star[], constellations: Constellation[], chapter?: Chapter): void {
    this.clearStars();
    this.currentStars = stars;
    this.currentConstellations = constellations;
    this.currentChapter = chapter || null;
    this.createBackgroundStars(stars.length * 3);
    this.createStars(stars);
    this.createConstellationLines(constellations);
    this.updateHiddenStarsVisibility();
  }

  public updateHiddenStarsVisibility(): void {
    if (!this.currentChapter) return;
    
    let newlyRevealed: string[] = [];
    
    this.currentStars.forEach(star => {
      if (!star.hidden) return;
      
      const starMesh = this.stars.get(star.id);
      if (!starMesh) return;
      
      const wasVisible = starMesh.visible;
      const isDiscovered = this.stateManager.isStarDiscovered(star.id);
      const isRevealed = this.stateManager.isHiddenStarRevealed(star.id, this.currentChapter!);
      
      const material = starMesh.material as THREE.MeshBasicMaterial;
      const glowMesh = starMesh.children[0] as THREE.Mesh;
      const glowMaterial = glowMesh?.material as THREE.MeshBasicMaterial;
      
      if (isDiscovered) {
        starMesh.visible = true;
        starMesh.userData.isClickable = true;
      } else if (isRevealed) {
        starMesh.visible = true;
        material.opacity = 0.15;
        if (glowMaterial) {
          glowMaterial.opacity = 0.05;
        }
        starMesh.userData.isClickable = true;
        
        if (!wasVisible) {
          newlyRevealed.push(star.id);
        }
      } else {
        starMesh.visible = false;
        starMesh.userData.isClickable = false;
      }
    });
    
    if (newlyRevealed.length > 0) {
      eventBus.emit('hiddenStars:revealed', newlyRevealed);
    }
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
      starMesh.userData = { starId: star.id, isClickable: star.isClickable, isHidden: star.hidden || false };
      
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
      this.starOriginalColors.set(star.id, new THREE.Color(star.color));
      this.starOriginalPositions.set(star.id, starMesh.position.clone());
      
      if (!this.stateManager.isStarDiscovered(star.id)) {
        if (star.hidden) {
          starMaterial.opacity = 0;
          glowMaterial.opacity = 0;
          starMesh.visible = false;
        } else {
          starMaterial.opacity = 0.1;
        }
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
    
    const starMeshes = Array.from(this.stars.values()).filter(s => {
      if (!s.userData.isClickable) return false;
      if (s.userData.isHidden && !this.stateManager.isStarDiscovered(s.userData.starId)) return false;
      return true;
    });
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
    
    const starMeshes = Array.from(this.stars.values()).filter(s => {
      if (!s.userData.isClickable) return false;
      if (s.userData.isHidden && !this.stateManager.isStarDiscovered(s.userData.starId)) return false;
      return true;
    });
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
      const isHidden = starMesh.userData.isHidden;
      
      if (isHidden) {
        starMesh.visible = true;
        this.animateHiddenStarDiscovery(starMesh, material);
      } else {
        this.animateStarDiscovery(starMesh, material);
      }
      
      this.stateManager.addDiscoveredStar(starId);
      
      if (isHidden) {
        const starData = this.currentStars.find(s => s.id === starId);
        eventBus.emit('toast:show', { message: `🌟 发现隐藏星点：${starData?.name || '未知星'}！`, duration: 4000 });
      } else {
        eventBus.emit('toast:show', { message: '发现新星！' });
      }
      
      if (!isHidden && this.currentChapter) {
        this.updateHiddenStarsVisibility();
      }
    }
  }

  private animateStarDiscovery(starMesh: THREE.Mesh, material: THREE.MeshBasicMaterial): void {
    const duration = 1;
    let elapsed = 0;
    const originalScale = starMesh.userData.originalScale || starMesh.scale.x;
    
    const animate = () => {
      elapsed += this.engine.getDeltaTime();
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = MathUtils.easeInOutCubic(progress);
      
      material.opacity = 0.2 + easeProgress * 0.8;
      starMesh.scale.setScalar(originalScale * (1 + Math.sin(progress * Math.PI) * 0.5));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        starMesh.scale.setScalar(originalScale);
      }
    };
    
    animate();
  }

  private animateHiddenStarDiscovery(starMesh: THREE.Mesh, material: THREE.MeshBasicMaterial): void {
    const duration = 2;
    let elapsed = 0;
    const originalScale = starMesh.userData.originalScale || starMesh.scale.x;
    
    const glowMesh = starMesh.children[0] as THREE.Mesh;
    const glowMaterial = glowMesh?.material as THREE.MeshBasicMaterial;
    
    const animate = () => {
      elapsed += this.engine.getDeltaTime();
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = MathUtils.easeInOutCubic(progress);
      
      material.opacity = easeProgress;
      if (glowMaterial) {
        glowMaterial.opacity = easeProgress * 0.5;
      }
      
      const pulseScale = 1 + Math.sin(progress * Math.PI * 3) * 0.3;
      starMesh.scale.setScalar(originalScale * (easeProgress * 0.5 + 0.5) * pulseScale);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        starMesh.scale.setScalar(originalScale);
        if (glowMaterial) {
          glowMaterial.opacity = 0.3;
        }
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
        this.animateStarPulse(starId, 0x00ff88, 500);
      }
      
      if (this.selectedStars.length >= 2) {
        this.clearTempConnectionLine();
        eventBus.emit('stars:connected', [...this.selectedStars]);
        this.selectedStars.forEach(sid => {
          const sm = this.stars.get(sid);
          if (sm) {
            sm.scale.setScalar(sm.userData.originalScale || 1);
          }
        });
        this.selectedStars = [];
      }
    }
    
    this.updateTempConnectionLine();
    eventBus.emit('selectedStars:changed', this.selectedStars);
  }

  private updateTempConnectionLine(): void {
    this.clearTempConnectionLine();
    
    if (this.selectedStars.length < 1) return;

    const points: THREE.Vector3[] = [];
    
    this.selectedStars.forEach(starId => {
      const starMesh = this.stars.get(starId);
      if (starMesh) {
        points.push(starMesh.position.clone());
      }
    });

    if (points.length > 1) {
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: 0x00ff88,
        transparent: true,
        opacity: 0.7,
        linewidth: 2,
      });
      this.tempConnectionLine = new THREE.Line(geometry, material);
      this.tempConnectionGroup.add(this.tempConnectionLine);
    }
  }

  private clearTempConnectionLine(): void {
    if (this.tempConnectionLine) {
      this.tempConnectionLine.geometry.dispose();
      (this.tempConnectionLine.material as THREE.Material).dispose();
      this.tempConnectionGroup.remove(this.tempConnectionLine);
      this.tempConnectionLine = null;
    }
  }

  private animateStarPulse(starId: string, color: number, duration: number): void {
    const starMesh = this.stars.get(starId);
    if (!starMesh || this.starAnimating.has(starId)) return;

    this.starAnimating.add(starId);
    const material = starMesh.material as THREE.MeshBasicMaterial;
    const originalColor = this.starOriginalColors.get(starId)?.clone() || new THREE.Color(0xffffff);
    const targetColor = new THREE.Color(color);
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const pulse = Math.sin(progress * Math.PI);
      
      material.color.lerpColors(originalColor, targetColor, pulse * 0.8);
      
      const glowMesh = starMesh.children[0] as THREE.Mesh;
      if (glowMesh) {
        const glowMaterial = glowMesh.material as THREE.MeshBasicMaterial;
        glowMaterial.color.lerpColors(originalColor, targetColor, pulse * 0.8);
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        material.color.copy(originalColor);
        if (glowMesh) {
          const glowMaterial = glowMesh.material as THREE.MeshBasicMaterial;
          glowMaterial.color.copy(originalColor);
        }
        this.starAnimating.delete(starId);
      }
    };

    animate();
  }

  private animateStarShake(starId: string, duration: number): void {
    const starMesh = this.stars.get(starId);
    if (!starMesh || this.starAnimating.has(starId)) return;

    this.starAnimating.add(starId);
    const originalPosition = starMesh.position.clone();
    const startTime = Date.now();
    const intensity = 0.5;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const shake = Math.sin(progress * Math.PI * 8) * intensity * (1 - progress);
      
      starMesh.position.x = originalPosition.x + shake;
      starMesh.position.y = originalPosition.y + shake * 0.5;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        starMesh.position.copy(originalPosition);
        this.starAnimating.delete(starId);
      }
    };

    animate();
  }

  private animateStarColor(starIds: string[], color: number, duration: number, restoreAfter: boolean = true): void {
    starIds.forEach(starId => {
      const starMesh = this.stars.get(starId);
      if (!starMesh) return;

      const material = starMesh.material as THREE.MeshBasicMaterial;
      const originalColor = this.starOriginalColors.get(starId)?.clone() || new THREE.Color(0xffffff);
      const targetColor = new THREE.Color(color);
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        material.color.lerpColors(originalColor, targetColor, progress);
        
        const glowMesh = starMesh.children[0] as THREE.Mesh;
        if (glowMesh) {
          const glowMaterial = glowMesh.material as THREE.MeshBasicMaterial;
          glowMaterial.color.lerpColors(originalColor, targetColor, progress);
        }

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else if (restoreAfter) {
          setTimeout(() => {
            material.color.copy(originalColor);
            if (glowMesh) {
              const glowMaterial = glowMesh.material as THREE.MeshBasicMaterial;
              glowMaterial.color.copy(originalColor);
            }
          }, duration);
        }
      };

      animate();
    });
  }

  private clearHighlightLines(): void {
    this.highlightLines.forEach(line => {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
      this.tempConnectionGroup.remove(line);
    });
    this.highlightLines.clear();
  }

  private showHighlightPath(constellationId: string, matchedStarIds: string[]): void {
    this.clearHighlightLines();
    
    const constellation = this.currentConstellations.find((c: Constellation) => c.id === constellationId);
    if (!constellation) return;

    const points: THREE.Vector3[] = [];
    
    constellation.connections.forEach(([startIdx, endIdx]) => {
      const startStarId = constellation.stars[startIdx];
      const endStarId = constellation.stars[endIdx];
      
      if (matchedStarIds.includes(startStarId) && matchedStarIds.includes(endStarId)) {
        const startStar = this.stars.get(startStarId);
        const endStar = this.stars.get(endStarId);
        
        if (startStar && endStar) {
          points.push(startStar.position.clone(), endStar.position.clone());
        }
      }
    });

    if (points.length > 0) {
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: 0x00ff88,
        transparent: true,
        opacity: 0.8,
        linewidth: 3,
      });
      const line = new THREE.LineSegments(geometry, material);
      this.highlightLines.set(constellationId, line);
      this.tempConnectionGroup.add(line);

      setTimeout(() => {
        this.clearHighlightLines();
      }, 3000);
    }
  }

  private onConstellationSuccess(constellationId: string): void {
    this.clearHighlightLines();
    this.clearTempConnectionLine();
    
    eventBus.emit('toast:show', {
      message: `✨ 成功连接星座！`,
      duration: 3000,
    });
  }

  private onConstellationPartial(constellationId: string, missingStarIds: string[]): void {
    this.clearHighlightLines();
    this.clearTempConnectionLine();
    
    const constellation = this.currentConstellations.find((c: Constellation) => c.id === constellationId);
    if (!constellation) return;

    const matchedStarIds = constellation.stars.filter((id: string) => !missingStarIds.includes(id));
    
    if (matchedStarIds.length > 0) {
      this.showHighlightPath(constellationId, matchedStarIds);
      this.animateStarColor(matchedStarIds, 0x00ff88, 800, true);
    }
    
    if (missingStarIds.length > 0) {
      missingStarIds.forEach(starId => {
        this.animateStarPulse(starId, 0xffdd00, 1000);
      });
    }

    const missingNames = missingStarIds.map(id => {
      const star = this.currentStars.find((s: Star) => s.id === id);
      return star?.name || id;
    }).join('、');

    eventBus.emit('toast:show', {
      message: `🌟 接近目标！${constellation.name}还差：${missingNames}`,
      duration: 4000,
    });
  }

  private onConstellationError(starIds: string[], bestMatch?: ConstellationMatchResult): void {
    this.clearHighlightLines();
    this.clearTempConnectionLine();
    
    starIds.forEach(starId => {
      this.animateStarColor([starId], 0xff4444, 600, true);
      this.animateStarShake(starId, 600);
    });

    if (bestMatch && bestMatch.matchPercentage > 0) {
      eventBus.emit('toast:show', {
        message: `❌ 连接错误，再试试吧！提示：可能与「${bestMatch.constellationName}」有关`,
        duration: 3500,
      });
    } else {
      eventBus.emit('toast:show', {
        message: `❌ 连接错误，请重新尝试`,
        duration: 3000,
      });
    }
  }

  public showConstellation(constellationId: string): void {
    const line = this.constellationLines.get(constellationId);
    if (line) {
      const material = line.material as THREE.LineBasicMaterial;
      this.animateConstellationReveal(line, material, () => {
        eventBus.emit('toast:show', { message: `✨ 解锁剧情回放：点击查看星座传说` });
      });
      this.stateManager.addDiscoveredConstellation(constellationId);
    }
  }

  private animateConstellationReveal(line: THREE.Line, material: THREE.LineBasicMaterial, onComplete?: () => void): void {
    const duration = 2;
    let elapsed = 0;
    
    const animate = () => {
      elapsed += this.engine.getDeltaTime();
      const progress = Math.min(elapsed / duration, 1);
      
      material.opacity = progress * 0.6;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        if (onComplete) {
          onComplete();
        }
      }
    };
    
    animate();
  }

  private animateStars(delta: number): void {
    const time = this.engine.getElapsedTime();
    const now = Date.now();

    if (this.isStarmapDistorted && now > this.starmapDistortUntil) {
      this.stopStarmapDistortion();
    }

    const isDistorted = this.isStarmapDistorted;
    
    this.stars.forEach((starMesh, starId) => {
      const isHidden = starMesh.userData.isHidden;
      const isDiscovered = this.stateManager.isStarDiscovered(starId);
      const isTemporarilyRevealed = this.starRevealedTemporarily.has(starId);
      
      if (isHidden && !isDiscovered && !isTemporarilyRevealed) {
        return;
      }
      
      const twinkle = Math.sin(time * 2 + starMesh.position.x * 0.1 + starMesh.position.z * 0.1);
      const material = starMesh.material as THREE.MeshBasicMaterial;
      
      let baseOpacity = isDiscovered ? 0.6 : 0.3;
      let twinkleAmount = isDiscovered ? 0.3 : 0.15;

      if (isDistorted) {
        const originalPos = this.starOriginalPositions.get(starId);
        if (originalPos) {
          const offsetAmount = 1.5 + Math.sin(time * 3 + starId.charCodeAt(starId.length - 1)) * 0.8;
          const offsetX = Math.sin(time * 1.5 + starMesh.position.y * 0.05) * offsetAmount;
          const offsetY = Math.cos(time * 1.2 + starMesh.position.x * 0.05) * offsetAmount * 0.6;
          const offsetZ = Math.sin(time * 1.8 + starMesh.position.z * 0.05) * offsetAmount * 0.3;
          
          starMesh.position.x = originalPos.x + offsetX;
          starMesh.position.y = originalPos.y + offsetY;
          starMesh.position.z = originalPos.z + offsetZ;
        }

        const distortFlicker = Math.sin(time * 8 + starId.length) * 0.5 + 0.5;
        baseOpacity *= (0.4 + distortFlicker * 0.4);
        twinkleAmount *= 0.5;
      } else {
        const originalPos = this.starOriginalPositions.get(starId);
        if (originalPos && starMesh.position.distanceTo(originalPos) > 0.01) {
          starMesh.position.lerp(originalPos, 0.1);
        }
      }
      
      if (isDiscovered || isTemporarilyRevealed) {
        material.opacity = (baseOpacity + twinkle * twinkleAmount) * this.dayNightStarBrightness;
      }
      
      const glowMesh = starMesh.children[0] as THREE.Mesh;
      if (glowMesh) {
        const glowMaterial = glowMesh.material as THREE.MeshBasicMaterial;
        let glowOpacity = (0.2 + Math.abs(twinkle) * 0.2) * this.dayNightStarBrightness;
        if (isDistorted) glowOpacity *= 0.6;
        glowMaterial.opacity = glowOpacity;
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
      this.clearTempConnectionLine();
      this.clearHighlightLines();
    }
  }

  public getStarPosition(starId: string): THREE.Vector3 | null {
    const star = this.stars.get(starId);
    return star ? star.position.clone() : null;
  }

  private startStarmapDistortion(durationMs: number): void {
    this.isStarmapDistorted = true;
    this.starmapDistortUntil = Date.now() + durationMs;

    eventBus.emit('toast:show', {
      message: '🌀 星图异常！星辰位置发生偏移...',
      duration: 4000,
    });
  }

  private stopStarmapDistortion(): void {
    if (!this.isStarmapDistorted) return;

    this.isStarmapDistorted = false;
    this.starmapDistortUntil = 0;

    this.stars.forEach((starMesh, starId) => {
      const originalPos = this.starOriginalPositions.get(starId);
      if (originalPos) {
        starMesh.position.copy(originalPos);
      }
    });

    eventBus.emit('toast:show', {
      message: '✨ 星图恢复正常',
      duration: 3000,
    });
  }

  private revealRandomStars(count: number, permanent: boolean): void {
    const hiddenStars = this.currentStars.filter(s => 
      s.hidden && !this.stateManager.isStarDiscovered(s.id)
    );

    if (hiddenStars.length === 0) {
      const undiscoveredNormal = this.currentStars.filter(s => 
        !s.hidden && !this.stateManager.isStarDiscovered(s.id)
      );
      if (undiscoveredNormal.length === 0) return;

      const shuffled = [...undiscoveredNormal].sort(() => Math.random() - 0.5);
      const starsToReveal = shuffled.slice(0, Math.min(count, shuffled.length));

      starsToReveal.forEach(star => {
        if (permanent) {
          this.discoverStar(star.id);
        } else {
          this.temporarilyRevealStar(star.id);
        }
      });

      if (starsToReveal.length > 0) {
        eventBus.emit('toast:show', {
          message: permanent 
            ? `🌟 发现了 ${starsToReveal.length} 颗新星！` 
            : `✨ 隐约看到了 ${starsToReveal.length} 颗新星的轮廓...`,
          duration: 4000,
        });
      }
      return;
    }

    const shuffled = [...hiddenStars].sort(() => Math.random() - 0.5);
    const starsToReveal = shuffled.slice(0, Math.min(count, shuffled.length));

    starsToReveal.forEach(star => {
      if (permanent) {
        this.discoverStar(star.id);
      } else {
        this.temporarilyRevealStar(star.id);
      }
    });

    if (starsToReveal.length > 0) {
      eventBus.emit('toast:show', {
        message: permanent 
          ? `🌟 发现了 ${starsToReveal.length} 颗隐藏星！` 
          : `✨ 隐约看到了 ${starsToReveal.length} 颗隐藏星的轮廓...`,
        duration: 4000,
      });
    }
  }

  private temporarilyRevealStar(starId: string): void {
    const starMesh = this.stars.get(starId);
    if (!starMesh) return;

    starMesh.visible = true;
    starMesh.userData.isClickable = true;
    this.starRevealedTemporarily.add(starId);

    setTimeout(() => {
      if (!this.stateManager.isStarDiscovered(starId)) {
        starMesh.visible = false;
        starMesh.userData.isClickable = false;
        this.starRevealedTemporarily.delete(starId);
      }
    }, 15000);
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
    
    this.clearTempConnectionLine();
    this.clearHighlightLines();
    
    while (this.starGroup.children.length > 0) {
      this.starGroup.remove(this.starGroup.children[0]);
    }
    
    while (this.constellationGroup.children.length > 0) {
      this.constellationGroup.remove(this.constellationGroup.children[0]);
    }
    
    while (this.tempConnectionGroup.children.length > 0) {
      this.tempConnectionGroup.remove(this.tempConnectionGroup.children[0]);
    }
    
    if (this.backgroundStars) {
      this.backgroundStars.geometry.dispose();
      (this.backgroundStars.material as THREE.Material).dispose();
      this.engine.scene.remove(this.backgroundStars);
      this.backgroundStars = null;
    }
    
    this.starOriginalColors.clear();
    this.starAnimating.clear();
    this.currentStars = [];
    this.currentConstellations = [];
    this.starOriginalPositions.clear();
    this.starRevealedTemporarily.clear();
    this.isStarmapDistorted = false;
    this.starmapDistortUntil = 0;
  }

  public dispose(): void {
    window.removeEventListener('mousemove', this.onMouseMove.bind(this));
    window.removeEventListener('click', this.onClick.bind(this));
    window.removeEventListener('touchstart', this.onTouch.bind(this));
    this.clearStars();
    if (this.tempConnectionGroup.parent) {
      this.engine.scene.remove(this.tempConnectionGroup);
    }
  }
}
