// Content script: listens for PROFILE_SWITCHED messages and shows a toast
// Uses Shadow DOM to avoid CSS conflicts with host page

let container: HTMLElement | null = null
let shadowRoot: ShadowRoot | null = null
let hideTimeout: ReturnType<typeof setTimeout> | null = null

function ensureContainer(): ShadowRoot {
  if (container && shadowRoot) return shadowRoot

  container = document.createElement('div')
  container.id = 'openheaders-toast-root'
  shadowRoot = container.attachShadow({ mode: 'closed' })

  const style = document.createElement('style')
  style.textContent = `
    :host {
      all: initial;
      position: fixed;
      bottom: 16px;
      right: 16px;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      pointer-events: none;
    }
    .toast {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      border-radius: 10px;
      background: #18181b;
      color: #fafafa;
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      opacity: 0;
      transform: translateY(8px);
      transition: opacity 0.2s ease, transform 0.2s ease;
    }
    .toast.show {
      opacity: 1;
      transform: translateY(0);
    }
    .toast-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }
  `
  shadowRoot.appendChild(style)
  document.documentElement.appendChild(container)
  return shadowRoot
}

function showToast(profileName: string, profileColor: string) {
  const shadow = ensureContainer()

  // Remove existing toast
  const existing = shadow.querySelector('.toast')
  if (existing) existing.remove()
  if (hideTimeout) clearTimeout(hideTimeout)

  const toast = document.createElement('div')
  toast.className = 'toast'

  const dot = document.createElement('span')
  dot.className = 'toast-dot'
  dot.style.backgroundColor = profileColor

  const text = document.createElement('span')
  text.textContent = profileName

  toast.appendChild(dot)
  toast.appendChild(text)
  shadow.appendChild(toast)

  // Trigger animation
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.classList.add('show')
    })
  })

  // Auto-dismiss after 2s
  hideTimeout = setTimeout(() => {
    toast.classList.remove('show')
    setTimeout(() => toast.remove(), 200)
  }, 2000)
}

// Listen for messages from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'PROFILE_SWITCHED') {
    showToast(message.profileName, message.profileColor)
  }
})
