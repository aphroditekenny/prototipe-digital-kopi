import { ref, onMounted, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import { Flip } from 'gsap/Flip'

// Register GSAP plugins
gsap.registerPlugin(Flip)

interface AnimationConfig {
  duration?: number
  ease?: string
  delay?: number
  repeat?: number
  yoyo?: boolean
}

interface TransitionConfig extends AnimationConfig {
  from?: any
  to?: any
  onComplete?: () => void
  onUpdate?: (progress: number) => void
}

interface FlipTransitionConfig {
  trigger: HTMLElement | string
  targets: HTMLElement | string
  duration?: number
  ease?: string
  scale?: boolean
  fade?: boolean
}

export function useGSAPAnimations() {
  // Active animations tracking
  const activeAnimations = ref(new Set<gsap.core.Tween>())
  const timelines = ref(new Map<string, gsap.core.Timeline>())

  // Default animation settings
  const defaultConfig: Required<AnimationConfig> = {
    duration: 1,
    ease: 'power2.out',
    delay: 0,
    repeat: 0,
    yoyo: false
  }

  // Basic animations
  const fadeIn = (
    target: HTMLElement | string,
    config?: AnimationConfig
  ): gsap.core.Tween => {
    const mergedConfig = { ...defaultConfig, ...config }
    
    const tween = gsap.fromTo(target, 
      { opacity: 0 },
      {
        opacity: 1,
        duration: mergedConfig.duration,
        ease: mergedConfig.ease,
        delay: mergedConfig.delay
      }
    )
    
    activeAnimations.value.add(tween)
    return tween
  }

  const fadeOut = (
    target: HTMLElement | string,
    config?: AnimationConfig
  ): gsap.core.Tween => {
    const mergedConfig = { ...defaultConfig, ...config }
    
    const tween = gsap.to(target, {
      opacity: 0,
      duration: mergedConfig.duration,
      ease: mergedConfig.ease,
      delay: mergedConfig.delay
    })
    
    activeAnimations.value.add(tween)
    return tween
  }

  const slideIn = (
    target: HTMLElement | string,
    direction: 'left' | 'right' | 'up' | 'down' = 'left',
    config?: AnimationConfig
  ): gsap.core.Tween => {
    const mergedConfig = { ...defaultConfig, ...config }
    
    const fromProps: any = { opacity: 0 }
    const toProps: any = { 
      opacity: 1,
      duration: mergedConfig.duration,
      ease: mergedConfig.ease,
      delay: mergedConfig.delay
    }

    switch (direction) {
      case 'left':
        fromProps.x = -100
        toProps.x = 0
        break
      case 'right':
        fromProps.x = 100
        toProps.x = 0
        break
      case 'up':
        fromProps.y = -100
        toProps.y = 0
        break
      case 'down':
        fromProps.y = 100
        toProps.y = 0
        break
    }

    const tween = gsap.fromTo(target, fromProps, toProps)
    activeAnimations.value.add(tween)
    return tween
  }

  const scaleIn = (
    target: HTMLElement | string,
    config?: AnimationConfig
  ): gsap.core.Tween => {
    const mergedConfig = { ...defaultConfig, ...config }
    
    const tween = gsap.fromTo(target,
      { scale: 0, opacity: 0 },
      {
        scale: 1,
        opacity: 1,
        duration: mergedConfig.duration,
        ease: mergedConfig.ease,
        delay: mergedConfig.delay
      }
    )
    
    activeAnimations.value.add(tween)
    return tween
  }

  // 3D Object animations
  const rotateTo = (
    target: any, // Three.js object
    rotation: { x?: number; y?: number; z?: number },
    config?: AnimationConfig
  ): gsap.core.Tween => {
    const mergedConfig = { ...defaultConfig, ...config }
    
    const tween = gsap.to(target.rotation, {
      ...rotation,
      duration: mergedConfig.duration,
      ease: mergedConfig.ease,
      delay: mergedConfig.delay
    })
    
    activeAnimations.value.add(tween)
    return tween
  }

  const moveTo = (
    target: any, // Three.js object
    position: { x?: number; y?: number; z?: number },
    config?: AnimationConfig
  ): gsap.core.Tween => {
    const mergedConfig = { ...defaultConfig, ...config }
    
    const tween = gsap.to(target.position, {
      ...position,
      duration: mergedConfig.duration,
      ease: mergedConfig.ease,
      delay: mergedConfig.delay
    })
    
    activeAnimations.value.add(tween)
    return tween
  }

  const scaleTo = (
    target: any, // Three.js object
    scale: number | { x?: number; y?: number; z?: number },
    config?: AnimationConfig
  ): gsap.core.Tween => {
    const mergedConfig = { ...defaultConfig, ...config }
    
    const scaleProps = typeof scale === 'number' 
      ? { x: scale, y: scale, z: scale }
      : scale

    const tween = gsap.to(target.scale, {
      ...scaleProps,
      duration: mergedConfig.duration,
      ease: mergedConfig.ease,
      delay: mergedConfig.delay
    })
    
    activeAnimations.value.add(tween)
    return tween
  }

  // Camera animations
  const animateCamera = (
    camera: any, // Three.js camera
    target: { 
      position?: { x?: number; y?: number; z?: number }
      rotation?: { x?: number; y?: number; z?: number }
      fov?: number
    },
    config?: TransitionConfig
  ): gsap.core.Timeline => {
    const mergedConfig = { ...defaultConfig, ...config }
    const tl = gsap.timeline()

    if (target.position) {
      tl.to(camera.position, {
        ...target.position,
        duration: mergedConfig.duration,
        ease: mergedConfig.ease
      }, 0)
    }

    if (target.rotation) {
      tl.to(camera.rotation, {
        ...target.rotation,
        duration: mergedConfig.duration,
        ease: mergedConfig.ease
      }, 0)
    }

    if (target.fov) {
      tl.to(camera, {
        fov: target.fov,
        duration: mergedConfig.duration,
        ease: mergedConfig.ease,
        onUpdate: () => {
          camera.updateProjectionMatrix()
        }
      }, 0)
    }

    if (mergedConfig.onComplete) {
      tl.call(mergedConfig.onComplete)
    }

    return tl
  }

  // Shared Element Transition using GSAP Flip
  const createSharedElementTransition = (
    config: FlipTransitionConfig
  ): void => {
    const trigger = typeof config.trigger === 'string' 
      ? document.querySelector(config.trigger) 
      : config.trigger
    
    const targets = typeof config.targets === 'string'
      ? document.querySelector(config.targets)
      : config.targets

    if (!trigger || !targets) {
      console.warn('Flip transition: trigger or targets not found')
      return
    }

    trigger.addEventListener('click', () => {
      // FLIP: First - record initial state
      const state = Flip.getState(targets)
      
      // FLIP: Last - make final changes
      // This would typically involve showing/hiding elements or changing layouts
      // The actual implementation depends on the specific transition
      
      // FLIP: Invert & Play
      Flip.from(state, {
        duration: config.duration || 0.8,
        ease: config.ease || 'power2.inOut',
        scale: config.scale !== false,
        fade: config.fade === true
      })
    })
  }

  // Timeline management
  const createTimeline = (
    id: string,
    config?: Partial<gsap.TimelineVars>
  ): gsap.core.Timeline => {
    const tl = gsap.timeline(config)
    timelines.value.set(id, tl)
    return tl
  }

  const getTimeline = (id: string): gsap.core.Timeline | undefined => {
    return timelines.value.get(id)
  }

  const playTimeline = (id: string): void => {
    const tl = timelines.value.get(id)
    if (tl) {
      tl.play()
    }
  }

  const pauseTimeline = (id: string): void => {
    const tl = timelines.value.get(id)
    if (tl) {
      tl.pause()
    }
  }

  const reverseTimeline = (id: string): void => {
    const tl = timelines.value.get(id)
    if (tl) {
      tl.reverse()
    }
  }

  // Utility functions
  const killAll = (): void => {
    gsap.killTweensOf('*')
    activeAnimations.value.clear()
    timelines.value.clear()
  }

  const killAnimation = (target: HTMLElement | string | any): void => {
    gsap.killTweensOf(target)
  }

  const pauseAll = (): void => {
    gsap.globalTimeline.pause()
  }

  const resumeAll = (): void => {
    gsap.globalTimeline.resume()
  }

  // Cleanup function
  const cleanup = (): void => {
    killAll()
  }

  // Lifecycle
  onUnmounted(() => {
    cleanup()
  })

  return {
    // Basic animations
    fadeIn,
    fadeOut,
    slideIn,
    scaleIn,
    
    // 3D animations
    rotateTo,
    moveTo,
    scaleTo,
    animateCamera,
    
    // Advanced animations
    createSharedElementTransition,
    
    // Timeline management
    createTimeline,
    getTimeline,
    playTimeline,
    pauseTimeline,
    reverseTimeline,
    
    // Utility
    killAll,
    killAnimation,
    pauseAll,
    resumeAll,
    cleanup,
    
    // State
    activeAnimations,
    timelines
  }
}
