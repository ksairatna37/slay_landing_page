class SliderLoadingManager {
  constructor() {
    this.overlay = null;
    this.canvas = null;
    this.ctx = null;
    this.animationId = null;
    this.startTime = null;
    this.duration = 3000;
    this.createLoadingScreen();
  }

  createLoadingScreen() {
    this.overlay = document.createElement("div");
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: #000000;
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    `;

    this.canvas = document.createElement("canvas");
    this.canvas.width = 300;
    this.canvas.height = 300;

    this.ctx = this.canvas.getContext("2d");
    this.overlay.appendChild(this.canvas);
    document.body.appendChild(this.overlay);

    this.startAnimation();
  }

  startAnimation() {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    let time = 0;
    let lastTime = 0;

    const dotRings = [
      { radius: 20, count: 8 },
      { radius: 35, count: 12 },
      { radius: 50, count: 16 },
      { radius: 65, count: 20 },
      { radius: 80, count: 24 }
    ];

    const colors = {
      primary: "#ffffff",
      accent: "#dddddd"
    };

    const easeInOutSine = (t) => {
      return -(Math.cos(Math.PI * t) - 1) / 2;
    };

    const easeInOutCubic = (t) => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const smoothstep = (edge0, edge1, x) => {
      const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
      return t * t * (3 - 2 * t);
    };

    const hexToRgb = (hex) => {
      if (hex.startsWith("#")) {
        return [
          parseInt(hex.slice(1, 3), 16),
          parseInt(hex.slice(3, 5), 16),
          parseInt(hex.slice(5, 7), 16)
        ];
      }
      const match = hex.match(/\d+/g);
      return match
        ? [parseInt(match[0]), parseInt(match[1]), parseInt(match[2])]
        : [255, 255, 255];
    };

    const interpolateColor = (color1, color2, t, opacity = 1) => {
      const rgb1 = hexToRgb(color1);
      const rgb2 = hexToRgb(color2);
      const r = Math.round(rgb1[0] + (rgb2[0] - rgb1[0]) * t);
      const g = Math.round(rgb1[1] + (rgb2[1] - rgb1[1]) * t);
      const b = Math.round(rgb1[2] + (rgb2[2] - rgb1[2]) * t);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    };

    const animate = (timestamp) => {
      if (!this.startTime) this.startTime = timestamp;

      if (!lastTime) lastTime = timestamp;
      const deltaTime = timestamp - lastTime;
      lastTime = timestamp;
      time += deltaTime * 0.001;

      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
      const rgb = hexToRgb(colors.primary);
      this.ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.9)`;
      this.ctx.fill();

      dotRings.forEach((ring, ringIndex) => {
        for (let i = 0; i < ring.count; i++) {
          const angle = (i / ring.count) * Math.PI * 2;
          const pulseTime = time * 2 - ringIndex * 0.4;
          const radiusPulse =
            easeInOutSine((Math.sin(pulseTime) + 1) / 2) * 6 - 3;
          const x = centerX + Math.cos(angle) * (ring.radius + radiusPulse);
          const y = centerY + Math.sin(angle) * (ring.radius + radiusPulse);

          const opacityPhase = (Math.sin(pulseTime + i * 0.2) + 1) / 2;
          const opacityBase = 0.3 + easeInOutSine(opacityPhase) * 0.7;
          const highlightPhase = (Math.sin(pulseTime) + 1) / 2;
          const highlightIntensity = easeInOutCubic(highlightPhase);

          this.ctx.beginPath();
          this.ctx.arc(x, y, 2, 0, Math.PI * 2);
          const colorBlend = smoothstep(0.2, 0.8, highlightIntensity);
          this.ctx.fillStyle = interpolateColor(
            colors.primary,
            colors.accent,
            colorBlend,
            opacityBase
          );
          this.ctx.fill();
        }
      });

      if (timestamp - this.startTime >= this.duration) {
        this.complete();
        return;
      }

      this.animationId = requestAnimationFrame(animate);
    };

    this.animationId = requestAnimationFrame(animate);
  }

  complete() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    if (this.overlay) {
      this.overlay.style.opacity = "0";
      this.overlay.style.transition = "opacity 0.8s ease";
      setTimeout(() => {
        this.overlay?.remove();

        setTimeout(() => {
          const sliderWrapper = document.querySelector(".slider-wrapper");
          if (sliderWrapper) {
            sliderWrapper.classList.add("loaded");
          }
        }, 500);
      }, 800);
    }
  }
}

const SLIDER_CONFIG = {
  settings: {
    transitionDuration: 2.5,
    autoSlideSpeed: 3000,
    globalIntensity: 1.0,
    speedMultiplier: 1.0,
    distortionStrength: 1.0,
    colorEnhancement: 1.0,
    glassRefractionStrength: 1.0,
    glassChromaticAberration: 1.0,
    glassBubbleClarity: 1.0,
    glassEdgeGlow: 1.0,
    glassLiquidFlow: 1.0
  }
};

import * as THREE from "https://esm.sh/three";

let currentSlideIndex = 0;
let isTransitioning = false;
let shaderMaterial, renderer, scene, camera;
let slideTextures = [];
let texturesLoaded = false;
let autoSlideTimer = null;
let progressAnimation = null;
let sliderEnabled = false;

let touchStartX = 0;
let touchEndX = 0;

const SLIDE_DURATION = () => SLIDER_CONFIG.settings.autoSlideSpeed;
const PROGRESS_UPDATE_INTERVAL = 50;
const TRANSITION_DURATION = () => SLIDER_CONFIG.settings.transitionDuration;

const slides = [
  { 
    title: "E-commerce Sellers", 
    description: "Instantly pay suppliers, receive crypto payments from global customers, and manage multi-currency settlements efficiently.",
    media: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=1965&auto=format&fit=crop" 
  },
  { 
    title: "Freelancers & Creators", 
    description: "Accept crypto for services worldwide, split earnings, and convert seamlessly to local currencies or stablecoins.",
    media: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2070&auto=format&fit=crop" 
  },
  { 
    title: "Agencies & Startups", 
    description: "Issue dedicated crypto cards for teams, automate recurring international contractor payments, and control spending in real time.",
    media: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=2070&auto=format&fit=crop" 
  },
  { 
    title: "Remote & Distributed Teams", 
    description: "Pay team members around the world in crypto, bypassing slow traditional wires, with instant, low-fee transfers.",
    media: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop" 
  },
  { 
    title: "Web3 Businesses & DAOs", 
    description: "Manage treasury, payroll, and vendor payments in crypto or stablecoins with advanced security and reporting.",
    media: "https://images.unsplash.com/photo-1639322537228-f710d846310a?q=80&w=2232&auto=format&fit=crop" 
  },
  { 
    title: "Digital Marketplaces", 
    description: "Enable fast, borderless payouts to sellers, influencers, or affiliates in any supported cryptocurrency.",
    media: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=1965&auto=format&fit=crop" 
  }
];

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D uTexture1;
  uniform sampler2D uTexture2;
  uniform float uProgress;
  uniform vec2 uResolution;
  uniform vec2 uTexture1Size;
  uniform vec2 uTexture2Size;
  
  uniform float uGlobalIntensity;
  uniform float uSpeedMultiplier;
  uniform float uDistortionStrength;
  uniform float uColorEnhancement;
  
  uniform float uGlassRefractionStrength;
  uniform float uGlassChromaticAberration;
  uniform float uGlassBubbleClarity;
  uniform float uGlassEdgeGlow;
  uniform float uGlassLiquidFlow;
  
  varying vec2 vUv;

  vec2 getCoverUV(vec2 uv, vec2 textureSize) {
    vec2 s = uResolution / textureSize;
    float scale = max(s.x, s.y);
    vec2 scaledSize = textureSize * scale;
    vec2 offset = (uResolution - scaledSize) * 0.5;
    return (uv * uResolution - offset) / scaledSize;
  }

  float noise(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float smoothNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    
    return mix(
      mix(noise(i), noise(i + vec2(1.0, 0.0)), f.x),
      mix(noise(i + vec2(0.0, 1.0)), noise(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  vec4 glassEffect(vec2 uv, float progress) {
    float glassStrength = 0.08 * uGlassRefractionStrength * uDistortionStrength * uGlobalIntensity;
    float chromaticAberration = 0.02 * uGlassChromaticAberration * uGlobalIntensity;
    float waveDistortion = 0.025 * uDistortionStrength;
    float clearCenterSize = 0.3 * uGlassBubbleClarity;
    float surfaceRipples = 0.004 * uDistortionStrength;
    float liquidFlow = 0.015 * uGlassLiquidFlow * uSpeedMultiplier;
    float rimLightWidth = 0.05;
    float glassEdgeWidth = 0.025;
    
    float brightnessPhase = smoothstep(0.8, 1.0, progress);
    float rimLightIntensity = 0.08 * (1.0 - brightnessPhase) * uGlassEdgeGlow * uGlobalIntensity;
    float glassEdgeOpacity = 0.06 * (1.0 - brightnessPhase) * uGlassEdgeGlow;

    vec2 center = vec2(0.5, 0.5);
    vec2 p = uv * uResolution;
    
    vec2 uv1 = getCoverUV(uv, uTexture1Size);
    vec2 uv2_base = getCoverUV(uv, uTexture2Size);
    
    float maxRadius = length(uResolution) * 0.85;
    float bubbleRadius = progress * maxRadius;
    vec2 sphereCenter = center * uResolution;
    
    float dist = length(p - sphereCenter);
    float normalizedDist = dist / max(bubbleRadius, 0.001);
    vec2 direction = (dist > 0.0) ? (p - sphereCenter) / dist : vec2(0.0);
    float inside = smoothstep(bubbleRadius + 3.0, bubbleRadius - 3.0, dist);
    
    float distanceFactor = smoothstep(clearCenterSize, 1.0, normalizedDist);
    float time = progress * 5.0 * uSpeedMultiplier;
    
    vec2 liquidSurface = vec2(
      smoothNoise(uv * 100.0 + time * 0.3),
      smoothNoise(uv * 100.0 + time * 0.2 + 50.0)
    ) - 0.5;
    liquidSurface *= surfaceRipples * distanceFactor;

    vec2 distortedUV = uv2_base;
    if (inside > 0.0) {
      float refractionOffset = glassStrength * pow(distanceFactor, 1.5);
      vec2 flowDirection = normalize(direction + vec2(sin(time), cos(time * 0.7)) * 0.3);
      distortedUV -= flowDirection * refractionOffset;

      float wave1 = sin(normalizedDist * 22.0 - time * 3.5);
      float wave2 = sin(normalizedDist * 35.0 + time * 2.8) * 0.7;
      float wave3 = sin(normalizedDist * 50.0 - time * 4.2) * 0.5;
      float combinedWave = (wave1 + wave2 + wave3) / 3.0;
      
      float waveOffset = combinedWave * waveDistortion * distanceFactor;
      distortedUV -= direction * waveOffset + liquidSurface;

      vec2 flowOffset = vec2(
        sin(time + normalizedDist * 10.0),
        cos(time * 0.8 + normalizedDist * 8.0)
      ) * liquidFlow * distanceFactor * inside;
      distortedUV += flowOffset;
    }

    vec4 newImg;
    if (inside > 0.0) {
      float aberrationOffset = chromaticAberration * pow(distanceFactor, 1.2);
      
      vec2 uv_r = distortedUV + direction * aberrationOffset * 1.2;
      vec2 uv_g = distortedUV + direction * aberrationOffset * 0.2;
      vec2 uv_b = distortedUV - direction * aberrationOffset * 0.8;

      float r = texture2D(uTexture2, uv_r).r;
      float g = texture2D(uTexture2, uv_g).g;
      float b = texture2D(uTexture2, uv_b).b;
      newImg = vec4(r, g, b, 1.0);
    } else {
      newImg = texture2D(uTexture2, uv2_base);
    }

    if (inside > 0.0 && rimLightIntensity > 0.0) {
      float rim = smoothstep(1.0 - rimLightWidth, 1.0, normalizedDist) *
                  (1.0 - smoothstep(1.0, 1.01, normalizedDist));
      newImg.rgb += rim * rimLightIntensity;

      float edge = smoothstep(1.0 - glassEdgeWidth, 1.0, normalizedDist) *
                   (1.0 - smoothstep(1.0, 1.01, normalizedDist));
      newImg.rgb = mix(newImg.rgb, vec3(1.0), edge * glassEdgeOpacity);
    }
    
    newImg.rgb = mix(newImg.rgb, newImg.rgb * 1.2, (uColorEnhancement - 1.0) * 0.5);
    
    vec4 currentImg = texture2D(uTexture1, uv1);
    
    if (progress > 0.95) {
      vec4 pureNewImg = texture2D(uTexture2, uv2_base);
      float endTransition = (progress - 0.95) / 0.05;
      newImg = mix(newImg, pureNewImg, endTransition);
    }
    
    return mix(currentImg, newImg, inside);
  }

  void main() {
    gl_FragColor = glassEffect(vUv, uProgress);
  }
`;

const createSlidesNavigation = () => {
  const navContainer = document.getElementById("slidesNav");
  navContainer.innerHTML = "";
  slides.forEach((slide, index) => {
    const navItem = document.createElement("div");
    navItem.className = `slide-nav-item ${index === 0 ? "active" : ""}`;
    navItem.dataset.slideIndex = index;
    navItem.innerHTML = `
      <div class="slide-progress-line">
        <div class="slide-progress-fill" style="width: 0%"></div>
      </div>
      <div class="slide-nav-title">${slide.title}</div>
    `;
    navItem.addEventListener("click", (e) => {
      e.stopPropagation();
      const targetIndex = parseInt(navItem.dataset.slideIndex);
      if (targetIndex !== currentSlideIndex && !isTransitioning) {
        navigateToSlide(targetIndex);
      }
    });
    navContainer.appendChild(navItem);
  });
};

const updateNavigationState = (activeIndex) => {
  const navItems = document.querySelectorAll(".slide-nav-item");
  navItems.forEach((item, index) => {
    item.classList.toggle("active", index === activeIndex);
  });
};

const updateSlideProgress = (slideIndex, progress) => {
  const navItems = document.querySelectorAll(".slide-nav-item");
  if (navItems[slideIndex]) {
    const progressFill = navItems[slideIndex].querySelector(".slide-progress-fill");
    progressFill.style.width = `${progress}%`;
    progressFill.style.opacity = "1";
  }
};

const fadeSlideProgress = (slideIndex) => {
  const navItems = document.querySelectorAll(".slide-nav-item");
  if (navItems[slideIndex]) {
    const progressFill = navItems[slideIndex].querySelector(".slide-progress-fill");
    progressFill.style.opacity = "0";
    setTimeout(() => (progressFill.style.width = "0%"), 300);
  }
};

const quickResetProgress = (slideIndex) => {
  const navItems = document.querySelectorAll(".slide-nav-item");
  if (navItems[slideIndex]) {
    const progressFill = navItems[slideIndex].querySelector(".slide-progress-fill");
    progressFill.style.transition = "width 0.2s ease-out";
    progressFill.style.width = "0%";
    setTimeout(() => {
      progressFill.style.transition = "width 0.1s ease, opacity 0.3s ease";
    }, 200);
  }
};

const updateCounter = (index) => {
  const slideNumber = document.getElementById("slideNumber");
  slideNumber.textContent = String(index + 1).padStart(2, "0");
  const slideTotal = document.getElementById("slideTotal");
  slideTotal.textContent = String(slides.length).padStart(2, "0");
};

const updateSlideInfo = (index) => {
  const titleEl = document.getElementById("slideTitle");
  const descEl = document.getElementById("slideDescription");
  if (!titleEl && !descEl) return;
  const slide = slides[index] || {};
  if (titleEl) {
    titleEl.classList.remove("active");
    setTimeout(() => {
      titleEl.textContent = slide.title || "";
      titleEl.classList.add("active");
    }, 60);
  }
  if (descEl) {
    descEl.classList.remove("active");
    setTimeout(() => {
      descEl.textContent = slide.description || "";
      descEl.classList.add("active");
    }, 80);
  }
};

const startAutoSlideTimer = () => {
  if (!texturesLoaded || !sliderEnabled || slideTextures.length < 2) return;
  stopAutoSlideTimer();
  let progress = 0;
  const increment = (100 / SLIDE_DURATION()) * PROGRESS_UPDATE_INTERVAL;
  progressAnimation = setInterval(() => {
    if (!sliderEnabled) {
      stopAutoSlideTimer();
      return;
    }
    progress += increment;
    updateSlideProgress(currentSlideIndex, progress);
    if (progress >= 100) {
      clearInterval(progressAnimation);
      progressAnimation = null;
      fadeSlideProgress(currentSlideIndex);
      if (!isTransitioning) {
        handleSlideChange();
      }
    }
  }, PROGRESS_UPDATE_INTERVAL);
};

const stopAutoSlideTimer = () => {
  if (progressAnimation) {
    clearInterval(progressAnimation);
    progressAnimation = null;
  }
  if (autoSlideTimer) {
    clearTimeout(autoSlideTimer);
    autoSlideTimer = null;
  }
};

const safeStartTimer = (delay = 0) => {
  stopAutoSlideTimer();
  if (sliderEnabled && texturesLoaded) {
    if (delay > 0) {
      autoSlideTimer = setTimeout(() => {
        if (sliderEnabled) startAutoSlideTimer();
      }, delay);
    } else {
      startAutoSlideTimer();
    }
  }
};

const navigateToSlide = (targetIndex) => {
  if (isTransitioning || targetIndex === currentSlideIndex) return;
  stopAutoSlideTimer();
  quickResetProgress(currentSlideIndex);
  const currentTexture = slideTextures[currentSlideIndex];
  const targetTexture = slideTextures[targetIndex];
  if (!currentTexture || !targetTexture) return;
  isTransitioning = true;
  shaderMaterial.uniforms.uTexture1.value = currentTexture;
  shaderMaterial.uniforms.uTexture2.value = targetTexture;
  shaderMaterial.uniforms.uTexture1Size.value = currentTexture.userData.size;
  shaderMaterial.uniforms.uTexture2Size.value = targetTexture.userData.size;
  currentSlideIndex = targetIndex;
  updateCounter(currentSlideIndex);
  updateSlideInfo(currentSlideIndex);
  updateNavigationState(currentSlideIndex);
  gsap.fromTo(
    shaderMaterial.uniforms.uProgress,
    { value: 0 },
    {
      value: 1,
      duration: TRANSITION_DURATION(),
      ease: "power2.inOut",
      onComplete: () => {
        shaderMaterial.uniforms.uProgress.value = 0;
        shaderMaterial.uniforms.uTexture1.value = targetTexture;
        shaderMaterial.uniforms.uTexture1Size.value = targetTexture.userData.size;
        isTransitioning = false;
        safeStartTimer(100);
      }
    }
  );
};

const handleSlideChange = () => {
  if (isTransitioning || !texturesLoaded || !sliderEnabled) return;
  const nextIndex = (currentSlideIndex + 1) % slides.length;
  navigateToSlide(nextIndex);
};

const handleSwipe = () => {
  if (Math.abs(touchEndX - touchStartX) < 50) return;
  if (touchEndX < touchStartX && !isTransitioning && sliderEnabled) {
    stopAutoSlideTimer();
    quickResetProgress(currentSlideIndex);
    handleSlideChange();
  } else if (touchEndX > touchStartX && !isTransitioning && sliderEnabled) {
    stopAutoSlideTimer();
    quickResetProgress(currentSlideIndex);
    const prevIndex = (currentSlideIndex - 1 + slides.length) % slides.length;
    navigateToSlide(prevIndex);
  }
};

const loadImageTexture = (src) => {
  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    const timeout = setTimeout(() => reject(new Error("Timeout")), 10000);
    loader.load(
      src,
      (texture) => {
        clearTimeout(timeout);
        texture.minFilter = texture.magFilter = THREE.LinearFilter;
        texture.userData = {
          size: new THREE.Vector2(texture.image.width, texture.image.height)
        };
        resolve(texture);
      },
      undefined,
      (error) => {
        clearTimeout(timeout);
        reject(error);
      }
    );
  });
};

const initializeRenderer = async () => {
  const canvas = document.querySelector(".webgl-canvas");
  if (!canvas) return;
  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: false,
    alpha: false
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  shaderMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTexture1: { value: null },
      uTexture2: { value: null },
      uProgress: { value: 0.0 },
      uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      uTexture1Size: { value: new THREE.Vector2(1, 1) },
      uTexture2Size: { value: new THREE.Vector2(1, 1) },
      uGlobalIntensity: { value: SLIDER_CONFIG.settings.globalIntensity },
      uSpeedMultiplier: { value: SLIDER_CONFIG.settings.speedMultiplier },
      uDistortionStrength: { value: SLIDER_CONFIG.settings.distortionStrength },
      uColorEnhancement: { value: SLIDER_CONFIG.settings.colorEnhancement },
      uGlassRefractionStrength: { value: SLIDER_CONFIG.settings.glassRefractionStrength },
      uGlassChromaticAberration: { value: SLIDER_CONFIG.settings.glassChromaticAberration },
      uGlassBubbleClarity: { value: SLIDER_CONFIG.settings.glassBubbleClarity },
      uGlassEdgeGlow: { value: SLIDER_CONFIG.settings.glassEdgeGlow },
      uGlassLiquidFlow: { value: SLIDER_CONFIG.settings.glassLiquidFlow }
    },
    vertexShader,
    fragmentShader
  });
  const geometry = new THREE.PlaneGeometry(2, 2);
  const mesh = new THREE.Mesh(geometry, shaderMaterial);
  scene.add(mesh);
  for (let i = 0; i < slides.length; i++) {
    try {
      const texture = await loadImageTexture(slides[i].media);
      slideTextures.push(texture);
    } catch (error) {
      console.warn(`Failed to load image ${i}`);
    }
  }
  if (slideTextures.length >= 2) {
    shaderMaterial.uniforms.uTexture1.value = slideTextures[0];
    shaderMaterial.uniforms.uTexture2.value = slideTextures[1];
    shaderMaterial.uniforms.uTexture1Size.value = slideTextures[0].userData.size;
    shaderMaterial.uniforms.uTexture2Size.value = slideTextures[1].userData.size;
    texturesLoaded = true;
    sliderEnabled = true;
    safeStartTimer(500);
  }
  const render = () => {
    requestAnimationFrame(render);
    renderer.render(scene, camera);
  };
  render();
};

window.addEventListener("load", async () => {
  createSlidesNavigation();
  updateCounter(0);
  updateSlideInfo(0);
  await initializeRenderer();
  const sliderWrapper = document.querySelector('.slider-wrapper');
  if (sliderWrapper && !sliderWrapper.classList.contains('loaded')) {
    sliderWrapper.classList.add('loaded');
  }
});

document.addEventListener("click", (e) => {
  if (e.target.closest(".slides-navigation")) return;
  if (!isTransitioning && sliderEnabled) {
    stopAutoSlideTimer();
    quickResetProgress(currentSlideIndex);
    handleSlideChange();
  }
});

document.addEventListener("touchstart", (e) => {
  touchStartX = e.changedTouches[0].screenX;
});

document.addEventListener("touchend", (e) => {
  touchEndX = e.changedTouches[0].screenX;
  handleSwipe();
});

window.addEventListener("resize", () => {
  if (renderer && shaderMaterial) {
    renderer.setSize(window.innerWidth, window.innerHeight);
    shaderMaterial.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
  }
});

document.addEventListener("keydown", (e) => {
  if (e.code === "Space" || e.code === "ArrowRight") {
    e.preventDefault();
    if (!isTransitioning && sliderEnabled) {
      stopAutoSlideTimer();
      quickResetProgress(currentSlideIndex);
      handleSlideChange();
    }
  } else if (e.code === "ArrowLeft") {
    e.preventDefault();
    if (!isTransitioning && sliderEnabled) {
      stopAutoSlideTimer();
      quickResetProgress(currentSlideIndex);
      const prevIndex = (currentSlideIndex - 1 + slides.length) % slides.length;
      navigateToSlide(prevIndex);
    }
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopAutoSlideTimer();
  } else if (sliderEnabled && !isTransitioning) {
    safeStartTimer();
  }
});