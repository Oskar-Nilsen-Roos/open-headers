import type { Directive } from 'vue'

declare module 'vue' {
  export interface GlobalDirectives {
    'delay-auto-animate': Directive
  }
}

export {}
