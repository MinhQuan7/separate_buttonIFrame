const eraWidget = new EraWidget();
let actionConfigs = new Array(2).fill(null); // 2 actions per button (ON/OFF) × 1 button
let isConfigured = false;
let initialDataLoaded = false;

// Button states - track locally (only 1 button now)
let buttonStates = [false];

// E-Ra realtime configs - map button index to realtime config
let realtimeConfigs = {
  0: null, // CB Tổng
};

// Pending action for confirm popup
let pendingAction = {
  buttonIndex: null,
  isOn: null,
};

// Device names for confirm popup (only 1 device now)
let deviceNames = ["CB Tổng"];

// URL parameter processing
function getURLParameter(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

// Load device name from URL parameter
function loadDeviceNameFromURL() {
  const deviceName = getURLParameter("name");
  if (deviceName) {
    deviceNames[0] = decodeURIComponent(deviceName);
    console.log(`Device name loaded from URL: ${deviceNames[0]}`);

    // Update UI with the new device name
    const deviceLabel = document.querySelector(".device-label");
    if (deviceLabel) {
      deviceLabel.textContent = deviceNames[0];
    }

    // Update mode label as well
    const modeLabel = document.querySelector(".mode-label");
    if (modeLabel) {
      modeLabel.textContent = `Mode ${deviceNames[0]}`;
    }
  }
}

// Load settings from localStorage
function loadSettings() {
  // Simple function for backward compatibility
  console.log("Settings loading - using default values");
}

// Update UI with current settings
function updateUIWithSettings() {
  // Simple function for backward compatibility
  console.log("UI updated with default settings");
}

eraWidget.init({
  onConfiguration: (configuration) => {
    console.log("E-Ra Configuration received:", configuration);

    // Configure action configs - 2 actions per button (ON/OFF)
    for (let i = 0; i < 2; i++) {
      if (configuration.actions?.[i]) {
        actionConfigs[i] = configuration.actions[i];
        console.log(`Action config ${i}:`, actionConfigs[i]);
      }
    }

    // Extract realtime configs from configuration
    if (configuration.realtime_configs) {
      configuration.realtime_configs.forEach((config, index) => {
        if (index < 1) {
          // Only map first realtime config to our 1 button
          realtimeConfigs[index] = config;
          console.log(
            `Realtime config: Button ${index} -> Config ID "${config.id}"`
          );
        }
      });
    }

    isConfigured = true;
    console.log("Widget configured successfully");

    // Remove no-connection indicator when configured
    document.getElementById(`container-0`).classList.remove("no-connection");

    // Request initial data sync after configuration
    console.log("Requesting initial data sync...");
  },

  onValues: (values) => {
    console.log("E-Ra values received:", values);

    // Update button states based on received values
    if (values && typeof values === "object") {
      let hasDataUpdates = false;

      Object.keys(realtimeConfigs).forEach((buttonIndex) => {
        const config = realtimeConfigs[buttonIndex];
        if (config && values[config.id]) {
          const serverValue = values[config.id].value;
          const isOn = Boolean(serverValue && serverValue !== 0);
          console.log(
            `Button ${buttonIndex}: Config ID=${config.id}, Server value=${serverValue}, isOn=${isOn}`
          );

          // Update button state if different from local state
          if (buttonStates[buttonIndex] !== isOn) {
            buttonStates[buttonIndex] = isOn;
            updateButtonUI(parseInt(buttonIndex), isOn);
            hasDataUpdates = true;
          }
        }
      });

      // Mark initial data as loaded on first data reception
      if (!initialDataLoaded && hasDataUpdates) {
        initialDataLoaded = true;
        console.log("Initial data synchronization completed via onValues");
      }
    }
  },

  // Add onDataSync callback to handle periodic data updates
  onDataSync: (values) => {
    console.log("E-Ra data sync received:", values);

    // Process the same way as onValues
    if (values && typeof values === "object") {
      Object.keys(realtimeConfigs).forEach((buttonIndex) => {
        const config = realtimeConfigs[buttonIndex];
        if (config && values[config.id]) {
          const serverValue = values[config.id].value;
          const isOn = Boolean(serverValue && serverValue !== 0);
          console.log(
            `Data sync - Button ${buttonIndex}: Config ID=${config.id}, Server value=${serverValue}, isOn=${isOn}`
          );

          // Always update if different from local state
          if (buttonStates[buttonIndex] !== isOn) {
            console.log(
              `Updating button ${buttonIndex} from ${buttonStates[buttonIndex]} to ${isOn}`
            );
            buttonStates[buttonIndex] = isOn;
            updateButtonUI(parseInt(buttonIndex), isOn);
          }
        }
      });
    }
  },
});

function updateButtonUI(buttonIndex, isOn) {
  console.log(`updateButtonUI: buttonIndex=${buttonIndex}, isOn=${isOn}`);

  // Update all UI elements
  const statusElement = document.getElementById(`status-${buttonIndex}`);
  const controlButtonElement = document.getElementById(
    `control-button-${buttonIndex}`
  );
  const hiddenButtonElement = document.getElementById(`button-${buttonIndex}`);

  if (isOn) {
    // ON state
    statusElement.classList.add("active");
    statusElement.textContent = "On";
    controlButtonElement.textContent = "Turn ON";
    controlButtonElement.classList.add("active");
    hiddenButtonElement.textContent = "ON";
  } else {
    // OFF state
    statusElement.classList.remove("active");
    statusElement.textContent = "Off";
    controlButtonElement.textContent = "Turn OFF";
    controlButtonElement.classList.remove("active");
    hiddenButtonElement.textContent = "OFF";
  }

  // Update global status variables for backward compatibility
  window[`status${buttonIndex}`] = isOn;
}

function updateButtonState(buttonIndex, isOn) {
  console.log(`updateButtonState: buttonIndex=${buttonIndex}, isOn=${isOn}`);

  // Update local state
  buttonStates[buttonIndex] = isOn;

  // Update UI
  updateButtonUI(buttonIndex, isOn);
}

function toggleButton(buttonIndex) {
  const currentState = buttonStates[buttonIndex];
  const newState = !currentState;

  // Show confirm popup instead of direct action
  showConfirmPopup(buttonIndex, newState);
}

function showConfirmPopup(buttonIndex, isOn) {
  // Store pending action
  pendingAction.buttonIndex = buttonIndex;
  pendingAction.isOn = isOn;

  // Update popup content
  const confirmAction = document.getElementById("confirmAction");
  const confirmDevice = document.getElementById("confirmDevice");
  const confirmButton = document.getElementById("confirmButton");

  // Set action text and styling
  confirmAction.textContent = isOn ? "bật" : "tắt";
  confirmAction.className = isOn ? "confirm-action" : "confirm-action off";

  // Set device name
  confirmDevice.textContent = deviceNames[buttonIndex];

  // Set confirm button styling
  confirmButton.className = isOn
    ? "confirm-btn confirm"
    : "confirm-btn confirm off";
  confirmButton.textContent = "Xác nhận";

  // Show popup
  const overlay = document.getElementById("confirmOverlay");
  overlay.classList.add("show");

  // Prevent body scroll
  document.body.style.overflow = "hidden";
}

function cancelConfirm() {
  // Hide popup
  const overlay = document.getElementById("confirmOverlay");
  overlay.classList.remove("show");

  // Restore body scroll
  document.body.style.overflow = "";

  // Clear pending action
  pendingAction.buttonIndex = null;
  pendingAction.isOn = null;
}

function executeAction() {
  // Execute the pending action
  if (pendingAction.buttonIndex !== null && pendingAction.isOn !== null) {
    controlButton(pendingAction.buttonIndex, pendingAction.isOn);
  }

  // Hide popup
  cancelConfirm();
}

function controlButton(buttonIndex, isOn) {
  console.log(`controlButton called: buttonIndex=${buttonIndex}, isOn=${isOn}`);

  if (!isConfigured) {
    console.warn("Configuration pending - widget not ready");
    // Show container as no-connection
    document.getElementById(`container-0`).classList.add("no-connection");
    return;
  }

  // Calculate action index: buttonIndex * 2 + (ON=0, OFF=1)
  const actionIndex = buttonIndex * 2 + (isOn ? 0 : 1);
  console.log(`Action index: ${actionIndex}`);

  if (actionConfigs[actionIndex]) {
    console.log("Triggering E-Ra action:", actionConfigs[actionIndex]);

    // Use E-Ra standard format
    eraWidget.triggerAction(actionConfigs[actionIndex].action, null, {
      value: isOn ? 1 : 0,
    });

    // Update UI immediately for better UX
    updateButtonState(buttonIndex, isOn);

    // Request data sync after action to confirm state change
  } else {
    console.warn(`No action config found for index ${actionIndex}`);
    // Still update UI locally even if no server action
    updateButtonState(buttonIndex, isOn);
  }
}

// Touch event handling for mobile devices
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".status, .control-button").forEach((element) => {
    let buttonIndex;

    // Get button index from element ID
    if (element.classList.contains("control-button")) {
      buttonIndex = parseInt(element.id.split("-")[2]);
    } else if (element.classList.contains("status")) {
      buttonIndex = parseInt(element.id.split("-")[1]);
    }

    // Add touch event
    element.addEventListener("touchend", (e) => {
      e.preventDefault();
      toggleButton(buttonIndex);
    });
  });

  // Close popup when clicking outside
  document
    .getElementById("confirmOverlay")
    .addEventListener("click", function (e) {
      if (e.target === this) {
        cancelConfirm();
      }
    });

  // Handle Escape key to close popup
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      cancelConfirm();
    }
  });
});

// Initialize all buttons with loading state, wait for E-Ra data via onValues
document.addEventListener("DOMContentLoaded", function () {
  // Load device name from URL parameter first
  loadDeviceNameFromURL();

  // Show loading state initially
  // Show as no-connection until configured and data received
  document.getElementById(`container-0`).classList.add("no-connection");

  // Set initial UI state (will be updated when onValues receives data)
  updateButtonUI(0, false);

  console.log(
    "DOM loaded - waiting for E-Ra configuration and data via onValues..."
  );

  // Add timeout fallback if no data received after configuration
  setTimeout(() => {
    if (isConfigured && !initialDataLoaded) {
      console.warn(
        "No data received via onValues - keeping default OFF states"
      );
      initialDataLoaded = true;
      // Remove no-connection indicator
      document.getElementById(`container-0`).classList.remove("no-connection");
    }
  }, 10000); // 10 second timeout for data reception
});
