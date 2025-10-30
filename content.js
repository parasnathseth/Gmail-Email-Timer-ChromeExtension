console.log("Email Timer script loaded (with roasts!).");

const ROASTS = [
  "Are you writing a novel? This is an email.",
  "That 'Send' button isn't just for decoration, you know.",
  "At this rate, the recipient will have retired.",
  "Remember when emails were quick? Good times.",
  "Maybe try a carrier pigeon? Might be faster.",
  "Are you carving this email into a stone tablet?",
  "I've seen glaciers melt faster than this draft.",
  "Did you forget what you were trying to say?",
  "Let it go. Whatever it is, just let it go.",
  "Is this an email or a screenplay?",
  "Okay, Shakespeare, time to wrap it up.",
  "At this rate, you're on track to finish by next year.",
  "Why not just send a postcard instead?",
  "I wanna charge you rent for occupying this window for so long.",
];

/**
 * Finds the "Compose" button and attaches a click listener.
 * We use a MutationObserver to watch for the button appearing, 
 * as Gmail is a single-page-app and it might not be on the page at load.
 */
function observeForComposeButton() {
  // Gmail's "Compose" button has a stable selector: [role="button"][gh="cm"]
  const composeButtonSelector = '[role="button"][gh="cm"]';

  const observer = new MutationObserver((mutations, obs) => {
    const composeButton = document.querySelector(composeButtonSelector);
    if (composeButton) {
      console.log("Found 'Compose' button. Attaching listener.");
      // Once found, attach the listener
      composeButton.addEventListener('click', handleComposeClick);
      // We found it, so we can stop observing
      obs.disconnect();
    }
  });

  // Start observing the whole document body for changes
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

/**
 * This function is called when the "Compose" button is clicked.
 * It waits for the compose window to appear and then attaches a timer.
 */
function handleComposeClick() {
  console.log("'Compose' clicked. Looking for new compose window...");
  
  // We use a MutationObserver to wait for the new compose window to be
  // added to the page. This is more reliable than a simple setTimeout.
  const composeWindowObserver = new MutationObserver((mutations, obs) => {
    // Gmail's compose windows have a [role="dialog"] and contain a "Send" button.
    // We look for one that *doesn't* have our timer attached yet.
    const allComposeWindows = document.querySelectorAll('[role="dialog"]');
    
    for (const composeWindow of allComposeWindows) {
      // Check if it's a new message window (has a "Send" button)
      const hasSendButton = composeWindow.querySelector('[role="button"][data-tooltip*="Send"]');
      
      // Check if we've already attached a timer
      const hasTimer = composeWindow.dataset.timerAttached === 'true';

      if (hasSendButton && !hasTimer) {
        console.log("Found new compose window. Attaching timer.");
        composeWindow.dataset.timerAttached = 'true';
        attachTimerToWindow(composeWindow);
        // We don't disconnect, as the user might open *another* compose window
      }
    }
  });

  // Start observing for new compose windows
  composeWindowObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
}

/**
 * Creates and attaches the timer UI and stop-logic to a specific compose window.
 * @param {HTMLElement} composeWindow - The DOM element for the compose window.
 */
function attachTimerToWindow(composeWindow) {
  // 1. Create a container for our UI
  const timerContainer = document.createElement('div');
  timerContainer.style.position = 'absolute';
  timerContainer.style.top = '10px';
  timerContainer.style.right = '90px'; // Position it left of the standard window buttons
  timerContainer.style.zIndex = '9998';
  timerContainer.style.textAlign = 'right';

  // 2. Create the timer display element
  const timerDiv = document.createElement('div');
  timerDiv.style.fontSize = '14px';
  timerDiv.style.fontFamily = 'monospace';
  timerDiv.style.color = '#333';
  timerDiv.style.backgroundColor = '#f5f5f5';
  timerDiv.style.padding = '4px 8px';
  timerDiv.style.borderRadius = '4px';
  timerDiv.textContent = '0:00';
  
  // 3. Create the roast display element
  const roastDiv = document.createElement('div');
  roastDiv.style.fontSize = '12px';
  roastDiv.style.color = '#c0392b'; // A nice "roasty" red
  roastDiv.style.marginTop = '4px';
  roastDiv.style.fontFamily = 'sans-serif';
  roastDiv.style.fontWeight = 'bold';
  roastDiv.style.maxWidth = '200px';
  
  // 4. Add timer and roast to the container
  timerContainer.appendChild(timerDiv);
  timerContainer.appendChild(roastDiv);

  // 5. Find the header of the compose window to inject the container
  const header = composeWindow.querySelector('[role="dialog"] > div:first-child [aria-label="New Message"]');
  if (header && header.parentElement) {
    header.parentElement.style.position = 'relative'; // Ensure parent is positioned
    header.parentElement.appendChild(timerContainer);
  } else {
    composeWindow.appendChild(timerContainer); // Fallback
  }

  // 6. Start the timer logic
  let seconds = 0;
  let roastIndex = 0;
  const firstRoastTime = 180; // 3 minutes
  const subsequentRoastTime = 120; // 2 minutes

  const intervalId = setInterval(() => {
    seconds++;
    
    // Update timer display
    const minutes = Math.floor(seconds / 60);
    const displaySeconds = seconds % 60;
    timerDiv.textContent = `${minutes}:${displaySeconds < 10 ? '0' : ''}${displaySeconds}`;

    // Check for the first roast at 3 minutes
    if (seconds === firstRoastTime) {
      roastDiv.textContent = ROASTS[roastIndex % ROASTS.length];
      roastIndex++;
    }
    // Check for subsequent roasts every 2 minutes after that
    else if (seconds > firstRoastTime && (seconds - firstRoastTime) % subsequentRoastTime === 0) {
      roastDiv.textContent = ROASTS[roastIndex % ROASTS.length];
      roastIndex++;
    }
  }, 1000);

  // 7. Create the function to stop the timer
  const stopTimer = () => {
    console.log(`Timer stopped at ${timerDiv.textContent}`);
    clearInterval(intervalId);
    timerContainer.remove(); // Remove the whole container

    // IMPORTANT: Remove the click listeners to prevent memory leaks
    sendButton.removeEventListener('click', stopTimer);
    discardButton.removeEventListener('click', stopTimer);
    closeButton.removeEventListener('click', stopTimer);
  };

  // 8. Find the "Send", "Discard", and "Close" buttons *within* this window
  const sendButton = composeWindow.querySelector('[role="button"][data-tooltip*="Send"]');
  const discardButton = composeWindow.querySelector('[role="button"][aria-label="Discard draft"]');
  const closeButton = composeWindow.querySelector('[role="button"][aria-label="Close"]');

  // 9. Attach the stop listener to all of them
  if (sendButton) sendButton.addEventListener('click', stopTimer);
  if (discardButton) discardButton.addEventListener('click', stopTimer);
  if (closeButton) closeButton.addEventListener('click', stopTimer);
}

// --- Start the extension ---
// This is the entry point. We start by looking for the "Compose" button.
observeForComposeButton();