console.log("Email Timer script loaded.");

const FIRST_ROAST_TIME = 180; // 3 minutes
const SUBSEQUENT_ROAST_TIME = 120; // 2 minutes

// Selectors for key elements
const COMPOSE_BUTTON_SELECTOR = '[role="button"][gh="cm"]';
const REPLY_BUTTON_SELECTOR = '[role="link"][aria-label="Reply"]';
const REPLY_ALL_BUTTON_SELECTOR = '[role="link"][aria-label="Reply all"]';
const FORWARD_BUTTON_SELECTOR = '[role="link"][aria-label="Forward"]';
const COMPOSE_WINDOW_SELECTOR = '[role="dialog"]';
const SEND_BUTTON_SELECTOR = '[role="button"][aria-label="Send ‪(Ctrl-Enter)‬"]';
const DISCARD_BUTTON_SELECTOR = '[role="button"][aria-label="Discard draft ‪(Ctrl-Shift-D)‬"]';
const CLOSE_BUTTON_SELECTOR = 'img[aria-label="Save & close"]';

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

    this.composeWindow.prepend(this.container);
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
      const randomIndex = Math.floor(Math.random() * ROASTS.length);
      this.roastBubble.textContent = ROASTS[randomIndex];
      this.roastBubble.classList.add('visible');
    }, 400); // Must match CSS transition time
  }

  /**
   * Stops the timer, removes the UI, and cleans up event listeners.
   */
  stop() {
    console.log(`Timer stopped at ${this.timerDisplay.textContent}`);
    clearInterval(this.intervalId);

    this.saveSession(); // Save the session data

    if (this.container) {
      this.container.remove();
    }

    // Removing event listeners to prevent memory leaks
    if (this.sendButton) this.sendButton.removeEventListener('click', this.stop);
    if (this.discardButton) this.discardButton.removeEventListener('click', this.stop);
    if (this.closeButton) this.closeButton.removeEventListener('click', this.stop);
  }

  /**
   * Saves the completed timer session to chrome.storage.
   */
  saveSession() {
    // Don't save sessions that are too short
    if (this.seconds < 1) {
      return;
    }

    const session = {
      date: new Date().toISOString(),
      seconds: this.seconds,
    };

    chrome.storage.local.get({ timerSessions: [] }, (result) => {
      const sessions = result.timerSessions;
      sessions.push(session);
      chrome.storage.local.set({ timerSessions: sessions }, () => {
        console.log("Timer session saved:", session);
      });
    });
  }
}

/**
 * Sets up a persistent observer to watch for any new compose windows being added to the DOM.
 * This handles all cases: new compose, reply, forward, and opening drafts.
 */
function observeForComposeWindows() {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length === 0) return;
 .000
            for (const node of mutation.addedNodes) {
                // We only care about element nodes
                if (node.nodeType !== Node.ELEMENT_NODE) continue;

                // Check if the added node is a compose window itself
                if (node.matches(COMPOSE_WINDOW_SELECTOR)) {
                    handleFoundComposeWindow(node);
                }
                
                // Or, check if the added node contains a compose window
                const composeWindow = node.querySelector(COMPOSE_WINDOW_SELECTOR);
                if (composeWindow) {
                    handleFoundComposeWindow(composeWindow);
                }
            }
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });
    console.log("Persistent compose window observer initialized.");
}

/**
 * Attaches a timer to a newly found compose window if it's valid.
 * @param {Element} composeWindow - The compose window element.
 */
function handleFoundComposeWindow(composeWindow) {
    const hasSendButton = composeWindow.querySelector(SEND_BUTTON_SELECTOR);
    const hasTimerAlready = composeWindow.dataset.timerAttached === 'true';

    if (hasSendButton && !hasTimerAlready) {
        console.log("Found new compose window. Attaching timer.");
        composeWindow.dataset.timerAttached = 'true';
        attachTimerToWindow(composeWindow);
    }
}


/**
 * Uses event delegation to listen for clicks on compose, reply, etc., primarily for logging.
 */
function initializeEmailActionLogger() {
    document.body.addEventListener('click', (event) => {
        const target = event.target;
        const composeButton = target.closest(COMPOSE_BUTTON_SELECTOR);
        const replyButton = target.closest(REPLY_BUTTON_SELECTOR);
        const replyAllButton = target.closest(REPLY_ALL_BUTTON_SELECTOR);
        const forwardButton = target.closest(FORWARD_BUTTON_SELECTOR);

        if (composeButton) {
            console.log("'Compose' button clicked.");
        } else if (replyButton) {
            console.log("'Reply' button clicked.");
        } else if (replyAllButton) {
            console.log("'Reply All' button clicked.");
        } else if (forwardButton) {
            console.log("'Forward' button clicked.");
        }
    });
    console.log("Global click listener for email actions initialized for logging.");
}

/**
* Creates and attaches the timer UI and stop-logic to a specific compose window.
*/
function attachTimerToWindow(composeWindow) {
  const timer = new Timer(composeWindow);
  timer.start();
}
 
// Initialize the system
observeForComposeWindows();
initializeEmailActionLogger();