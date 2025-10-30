console.log("Email Timer MVP script loaded.");

/**
 * Finds the "Compose" button and attaches a click listener.
 * We use a MutationObserver to watch for the button appearing, 
 * as Gmail is a single-page-app and it might not be on the page at load.
 */
function observeForComposeButton() {

  const gmailComposeButtonSelector = '[role="button"][gh="cm"]';

  const observer = new MutationObserver((mutations, obs) => {
    const composeButton = document.querySelector(gmailComposeButtonSelector);
    if (composeButton) {
      console.log("Found 'Compose' button. Attaching listener.");
      composeButton.addEventListener('click', handleComposeClick);
      obs.disconnect(); // We found it, so we can stop observing
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
  // 1. Create the timer UI element
  const timerDiv = document.createElement('div');
  timerDiv.style.position = 'absolute';
  timerDiv.style.top = '8px';
  timerDiv.style.right = '90px'; // Position it left of the standard window buttons
  timerDiv.style.fontSize = '14px';
  timerDiv.style.fontFamily = 'monospace';
  timerDiv.style.color = '#333';
  timerDiv.style.backgroundColor = '#f5f5f5';
  timerDiv.style.padding = '4px 8px';
  timerDiv.style.borderRadius = '4px';
  timerDiv.style.zIndex = '9998'; // Just under the close buttons
  timerDiv.textContent = '0:00';

  // 2. Find the header of the compose window to inject the timer
  // This selector finds the bar that contains the "New Message" title
  const header = composeWindow.querySelector('[role="dialog"] > div:first-child [aria-label="New Message"]');
  if (header && header.parentElement) {
    // Inject the timer right next to the "New Message" title area
    header.parentElement.style.position = 'relative'; // Ensure parent is positioned
    header.parentElement.appendChild(timerDiv);
  } else {
    // Fallback: just append to the compose window itself
    composeWindow.appendChild(timerDiv);
  }

  // 3. Start the timer logic
  let seconds = 0;
  const intervalId = setInterval(() => {
    seconds++;
    const minutes = Math.floor(seconds / 60);
    const displaySeconds = seconds % 60;
    timerDiv.textContent = `${minutes}:${displaySeconds < 10 ? '0' : ''}${displaySeconds}`;
  }, 1000);

  // 4. Create the function to stop the timer
  const stopTimer = () => {
    console.log(`Timer stopped at ${timerDiv.textContent}`);
    clearInterval(intervalId);
    timerDiv.remove();
    
    //Removing the click listeners to prevent memory leaks
    sendButton.removeEventListener('click', stopTimer);
    discardButton.removeEventListener('click', stopTimer);
    closeButton.removeEventListener('click', stopTimer);
  };

  // 5. Find the "Send", "Discard", and "Close" buttons *within* this window
  // We search *inside* composeWindow to ensure we get the right buttons
  const sendButton = composeWindow.querySelector('[role="button"][data-tooltip*="Send"]');
  const discardButton = composeWindow.querySelector('[role="button"][aria-label="Discard draft"]');
  const closeButton = composeWindow.querySelector('[role="button"][aria-label="Close"]');

  // 6. Attach the stop listener to all of them
  if (sendButton) sendButton.addEventListener('click', stopTimer);
  if (discardButton) discardButton.addEventListener('click', stopTimer);
  if (closeButton) closeButton.addEventListener('click', stopTimer);
}

// This is the entry point. We start by looking for the "Compose" button.
observeForComposeButton();