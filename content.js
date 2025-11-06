console.log("Email Timer script loaded.");

const FIRST_ROAST_TIME = 180; // 3 minutes
const SUBSEQUENT_ROAST_TIME = 120; // 2 minutes

// Selectors for key elements
const COMPOSE_BUTTON_SELECTOR = '[role="button"][gh="cm"]';
const COMPOSE_WINDOW_SELECTOR = '[role="dialog"]';
const SEND_BUTTON_SELECTOR = '[role="button"][data-tooltip*="Send"]';
const DISCARD_BUTTON_SELECTOR = '[role="button"][aria-label="Discard draft"]';
const CLOSE_BUTTON_SELECTOR = '[role="button"][aria-label="Close"]';
const HEADER_SELECTOR = '[role="dialog"] > div:first-child [aria-label="New Message"]';

/**
 * Manages the entire lifecycle of a single timer instance.
 * This class creates the UI, starts the timer, handles roasts,
 * and cleans itself up when stopped.
 */
class Timer {
  constructor(composeWindow) {
    this.composeWindow = composeWindow;
    this.seconds = 0;
    this.roastIndex = 0;
    this.intervalId = null;
    this.container = null;
    this.timerDisplay = null;
    this.roastBubble = null;
    this.sendButton = null;
    this.discardButton = null;
    this.closeButton = null;

    // Bind 'this' for event listeners
    this.stop = this.stop.bind(this);
    this.tick = this.tick.bind(this);

    this.createUI();
    this.findAndBindControls();
  }

  createUI() {
    this.container = document.createElement('div');
    this.container.className = 'gmt-timer-container';

    this.timerDisplay = document.createElement('div');
    this.timerDisplay.className = 'gmt-timer-display';
    this.timerDisplay.textContent = '0:00';

    this.roastBubble = document.createElement('div');
    this.roastBubble.className = 'gmt-roast-bubble';

    this.container.appendChild(this.timerDisplay);
    this.container.appendChild(this.roastBubble);

    const header = this.composeWindow.querySelector(HEADER_SELECTOR);
    if (header && header.parentElement) {
      header.parentElement.style.position = 'relative'; // Ensure parent is positioned
      header.parentElement.appendChild(this.container);
    } else {
      this.composeWindow.appendChild(this.container); // Fallback
    }
  }

  /**
   * Finds the Send, Discard, and Close buttons and attaches the stop listener.
   */
  findAndBindControls() {
    this.sendButton = this.composeWindow.querySelector(SEND_BUTTON_SELECTOR);
    this.discardButton = this.composeWindow.querySelector(DISCARD_BUTTON_SELECTOR);
    this.closeButton = this.composeWindow.querySelector(CLOSE_BUTTON_SELECTOR);

    if (this.sendButton) this.sendButton.addEventListener('click', this.stop);
    if (this.discardButton) this.discardButton.addEventListener('click', this.stop);
    if (this.closeButton) this.closeButton.addEventListener('click', this.stop);
  }

  /**
   * Starts the timer interval.
   */
  start() {
    this.intervalId = setInterval(this.tick, 1000);
  }

  /**
   * The main timer loop, called every second.
   */
  tick() {
    this.seconds++;
    this.updateTimerDisplay();

    let shouldRoast = false;
    if (this.seconds === FIRST_ROAST_TIME) {
      shouldRoast = true;
    } else if (this.seconds > FIRST_ROAST_TIME && (this.seconds - FIRST_ROAST_TIME) % SUBSEQUENT_ROAST_TIME === 0) {
      shouldRoast = true;
    }

    if (shouldRoast) {
      this.showRoast();
    }
  }

  updateTimerDisplay() {
    const minutes = Math.floor(this.seconds / 60);
    const displaySeconds = this.seconds % 60;
    this.timerDisplay.textContent = `${minutes}:${displaySeconds < 10 ? '0' : ''}${displaySeconds}`;
  }

  /**
   * Fades out the old roast, updates text, and fades in the new one.
   */
  showRoast() {
    this.roastBubble.classList.remove('visible');

    setTimeout(() => {
      this.roastBubble.textContent = ROASTS[this.roastIndex % ROASTS.length];
      this.roastBubble.classList.add('visible');
      this.roastIndex++;
    }, 400); // Must match CSS transition time
  }

  /**
   * Stops the timer, removes the UI, and cleans up event listeners.
   */
  stop() {
    console.log(`Timer stopped at ${this.timerDisplay.textContent}`);
    clearInterval(this.intervalId);
    
    if (this.container) {
      this.container.remove();
    }

    // Removing event listeners to prevent memory leaks
    if (this.sendButton) this.sendButton.removeEventListener('click', this.stop);
    if (this.discardButton) this.discardButton.removeEventListener('click', this.stop);
    if (this.closeButton) this.closeButton.removeEventListener('click', this.stop);
  }
}

/**
 * Finds the "Compose" button and attaches a click listener.
 */
function observeForComposeButton() {
  const observer = new MutationObserver((mutations, obs) => {
    const composeButton = document.querySelector(COMPOSE_BUTTON_SELECTOR);
    if (composeButton) {
      console.log("Found 'Compose' button. Attaching listener.");
      composeButton.addEventListener('click', handleComposeClick);
      obs.disconnect(); // We found it, no need to observe anymore
    }
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

/**
 * Sets up an observer to find a new 'Compose' window.
 */
function handleComposeClick() {
  console.log("'Compose' clicked. Looking for new compose window...");

  const composeWindowObserver = new MutationObserver((mutations, obs) => {
    const allComposeWindows = document.querySelectorAll(COMPOSE_WINDOW_SELECTOR);
    for (const composeWindow of allComposeWindows) {
      const hasSendButton = composeWindow.querySelector(SEND_BUTTON_SELECTOR);
      const hasTimerAlready = composeWindow.dataset.timerAttached === 'true';

      if (hasSendButton && !hasTimerAlready) {
        console.log("Found new compose window. Attaching timer.");
        composeWindow.dataset.timerAttached = 'true';
        attachTimerToWindow(composeWindow);
      }
    }
  });

  composeWindowObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // TODO: Might want to add logic to disconnect this observer after a certain time or when the user navigates away.
}

/**
* Creates and attaches the timer UI and stop-logic to a specific compose window.
*/
function attachTimerToWindow(composeWindow) {
  const timer = new Timer(composeWindow);
  timer.start();
}
 
observeForComposeButton();