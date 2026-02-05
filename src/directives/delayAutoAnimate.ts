import type { Directive } from 'vue'
import autoAnimate, {
  type AutoAnimateOptions,
  type AutoAnimationPlugin,
  type AnimationController,
} from '@formkit/auto-animate'

type DelayAutoAnimateOptions = {
  enabled?: boolean
  delay?: number
  options?: Partial<AutoAnimateOptions> | AutoAnimationPlugin
}

type DelayAutoAnimateValue =
  | Partial<AutoAnimateOptions>
  | AutoAnimationPlugin
  | DelayAutoAnimateOptions
  | undefined

type DelayAutoAnimateElement = HTMLElement & {
  __delayAutoAnimateController?: AnimationController
  __delayAutoAnimateTimer?: number
}

function resolveConfig(value: DelayAutoAnimateValue): {
  delay: number
  options?: Partial<AutoAnimateOptions> | AutoAnimationPlugin
  enabled: boolean
} {
  if (value && typeof value === 'object' && ('options' in value || 'delay' in value)) {
    const config = value as DelayAutoAnimateOptions
    return {
      delay: typeof config.delay === 'number' ? config.delay : 0,
      options: config.options,
      enabled: config.enabled !== false,
    }
  }

  return {
    delay: 0,
    options: value as Partial<AutoAnimateOptions> | AutoAnimationPlugin | undefined,
    enabled: true,
  }
}

export const vDelayAutoAnimate: Directive<DelayAutoAnimateElement, DelayAutoAnimateValue> = {
  mounted(el, binding) {
    const { delay, options, enabled } = resolveConfig(binding.value)
    if (!enabled) return

    const controller = autoAnimate(el, options)
    el.__delayAutoAnimateController = controller
    controller.disable()

    if (typeof window === 'undefined') return

    if (delay > 0) {
      el.__delayAutoAnimateTimer = window.setTimeout(() => controller.enable(), delay)
      return
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => controller.enable())
    })
  },
  updated(el, binding) {
    const { options, enabled } = resolveConfig(binding.value)
    const controller = el.__delayAutoAnimateController

    if (!enabled) {
      controller?.disable()
      return
    }

    if (!controller) {
      const newController = autoAnimate(el, options)
      el.__delayAutoAnimateController = newController
      newController.disable()
    }

    el.__delayAutoAnimateController?.enable()
  },
  unmounted(el) {
    if (el.__delayAutoAnimateTimer) {
      window.clearTimeout(el.__delayAutoAnimateTimer)
    }
    el.__delayAutoAnimateController?.destroy?.()
  },
}
