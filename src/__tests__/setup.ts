import { config } from '@vue/test-utils'
import { vDelayAutoAnimate } from '@/directives/delayAutoAnimate'

config.global.directives = {
  ...(config.global.directives ?? {}),
  'delay-auto-animate': vDelayAutoAnimate,
}
