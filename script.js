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
const deviceNames = ["CB Tổng"];

// Settings configuration - prioritize URL params, fallback to localStorage
let deviceSettings = {
  deviceName: "CB Tổng",
  modeLabel: "Mode CB Tổng",
  modeValue: "Auto",
};

// Get settings from URL parameters
function getUrlParameters() {
  const urlParams = new URLSearchParams(window.location.search);
  return {
    deviceName: urlParams.get("deviceName"),
    modeLabel: urlParams.get("modeLabel"),
    modeValue: urlParams.get("modeValue"),
    deviceId: urlParams.get("deviceId"), // For unique identification
  };
}

// Load settings from URL params first, then localStorage
function loadSettings() {
  const urlParams = getUrlParameters();
  const savedSettings = localStorage.getItem("deviceSettings");

  // Priority: URL params > localStorage > defaults
  if (urlParams.deviceName || urlParams.modeLabel || urlParams.modeValue) {
    // Use URL parameters (highest priority)
    deviceSettings = {
      deviceName: urlParams.deviceName || deviceSettings.deviceName,
      modeLabel: urlParams.modeLabel || deviceSettings.modeLabel,
      modeValue: urlParams.modeValue || deviceSettings.modeValue,
      deviceId: urlParams.deviceId || null,
    };
    console.log("Settings loaded from URL parameters:", deviceSettings);
  } else if (savedSettings) {
    // Fallback to localStorage
    try {
      deviceSettings = JSON.parse(savedSettings);
      console.log("Settings loaded from localStorage:", deviceSettings);
    } catch (e) {
      console.warn("Failed to load settings from localStorage:", e);
    }
  }

  updateUIWithSettings();
}

// Save settings to both localStorage and E-Ra platform
function saveSettingsToStorage() {
  try {
    // Save to localStorage for immediate use
    localStorage.setItem("deviceSettings", JSON.stringify(deviceSettings));

    // Save to E-Ra platform if configured (for cross-device sync)
    if (isConfigured && deviceSettings.deviceId) {
      saveSettingsToEra();
    }
  } catch (e) {
    console.warn("Failed to save settings to localStorage:", e);
  }
}

// Save settings to E-Ra platform for cross-device synchronization
function saveSettingsToEra() {
  try {
    const settingsData = {
      deviceName: deviceSettings.deviceName,
      modeLabel: deviceSettings.modeLabel,
      modeValue: deviceSettings.modeValue,
      timestamp: Date.now(),
    };

    // Use E-Ra widget to send settings to platform
    if (eraWidget && typeof eraWidget.publishData === "function") {
      eraWidget.publishData(
        `settings_${deviceSettings.deviceId}`,
        settingsData
      );
      console.log("Settings saved to E-Ra platform:", settingsData);
    }
  } catch (e) {
    console.warn("Failed to save settings to E-Ra platform:", e);
  }
}

// Update UI with current settings
function updateUIWithSettings() {
  // Update device label
  const deviceLabelElement = document.querySelector(".device-label");
  if (deviceLabelElement) {
    deviceLabelElement.textContent = deviceSettings.deviceName;
  }

  // Update mode label
  const modeLabelElement = document.querySelector(".mode-label");
  if (modeLabelElement) {
    modeLabelElement.textContent = deviceSettings.modeLabel;
  }

  // Update mode display
  const modeDisplayElement = document.querySelector(".mode-display");
  if (modeDisplayElement) {
    modeDisplayElement.textContent = deviceSettings.modeValue;
  }

  // Update device name in confirm popup and array
  deviceNames[0] = deviceSettings.deviceName;
}

// Show settings panel
function showSettings() {
  // Populate inputs with current values
  document.getElementById("deviceNameInput").value = deviceSettings.deviceName;
  document.getElementById("modeLabelInput").value = deviceSettings.modeLabel;
  document.getElementById("modeValueInput").value = deviceSettings.modeValue;

  // Show overlay
  const overlay = document.getElementById("settingsOverlay");
  overlay.classList.add("show");

  // Prevent body scroll but allow panel scroll
  document.body.style.overflow = "hidden";

  // Ensure panel can scroll properly
  const panel = overlay.querySelector(".settings-panel");
  const content = overlay.querySelector(".settings-content");

  if (panel) {
    panel.style.overflowY = "auto";
    panel.scrollTop = 0; // Reset scroll position
  }

  if (content) {
    content.style.overflowY = "auto";
    content.scrollTop = 0; // Reset scroll position
  }

  // Show info about URL parameters if they exist
  const urlParams = getUrlParameters();
  if (urlParams.deviceName || urlParams.modeLabel || urlParams.modeValue) {
    console.log("URL Parameters detected:", urlParams);
    // Add visual indicator that URL params are active
    const settingsTitle = document.querySelector(".settings-title");
    if (settingsTitle && !settingsTitle.querySelector(".url-indicator")) {
      const indicator = document.createElement("span");
      indicator.className = "url-indicator";
      indicator.style.cssText =
        "color: #10b981; font-size: 10px; margin-left: 8px;";
      indicator.textContent = "(URL)";
      settingsTitle.appendChild(indicator);
    }
  }

  // Focus first input
  setTimeout(() => {
    document.getElementById("deviceNameInput").focus();

    // Scroll to top of content if needed
    if (content) {
      content.scrollTop = 0;
    }
  }, 200);
}

// Cancel settings
function cancelSettings() {
  // Hide overlay
  const overlay = document.getElementById("settingsOverlay");
  overlay.classList.remove("show");

  // Restore body scroll
  document.body.style.overflow = "";
}

// Save settings
function saveSettings() {
  // Get values from inputs
  const deviceName = document.getElementById("deviceNameInput").value.trim();
  const modeLabel = document.getElementById("modeLabelInput").value.trim();
  const modeValue = document.getElementById("modeValueInput").value.trim();

  // Validate inputs
  if (!deviceName) {
    alert("Tên thiết bị không được để trống!");
    document.getElementById("deviceNameInput").focus();
    return;
  }

  if (!modeLabel) {
    alert("Nhãn chế độ không được để trống!");
    document.getElementById("modeLabelInput").focus();
    return;
  }

  if (!modeValue) {
    alert("Giá trị chế độ không được để trống!");
    document.getElementById("modeValueInput").focus();
    return;
  }

  // Update settings
  deviceSettings.deviceName = deviceName;
  deviceSettings.modeLabel = modeLabel;
  deviceSettings.modeValue = modeValue;

  // Save to localStorage
  saveSettingsToStorage();

  // Update UI
  updateUIWithSettings();

  // Hide overlay
  cancelSettings();

  console.log("Settings saved:", deviceSettings);
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

    // Check for settings data from E-Ra platform
    if (
      deviceSettings.deviceId &&
      values[`settings_${deviceSettings.deviceId}`]
    ) {
      const serverSettings =
        values[`settings_${deviceSettings.deviceId}`].value;
      if (serverSettings && typeof serverSettings === "object") {
        // Update device settings from server
        deviceSettings = {
          ...deviceSettings,
          ...serverSettings,
        };
        updateUIWithSettings();
        console.log("Settings updated from E-Ra platform:", deviceSettings);
      }
    }

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

  // Close settings when clicking outside
  document
    .getElementById("settingsOverlay")
    .addEventListener("click", function (e) {
      // Only close if clicking on the overlay itself, not the panel
      if (e.target === this) {
        cancelSettings();
      }
    });

  // Handle Escape key to close popup and settings
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      cancelConfirm();
      cancelSettings();
    }
  });

  // Handle Enter key in settings inputs
  document.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      const activeElement = document.activeElement;
      if (activeElement && activeElement.classList.contains("settings-input")) {
        saveSettings();
      }
    }
  });
});

// Debug function to show current configuration
function debugConfiguration() {
  const urlParams = getUrlParameters();
  const config = {
    currentSettings: deviceSettings,
    urlParameters: urlParams,
    localStorage: JSON.parse(localStorage.getItem("deviceSettings") || "null"),
    eraConfigured: isConfigured,
    dataLoaded: initialDataLoaded,
  };
  console.log("=== DEVICE CONFIGURATION DEBUG ===");
  console.table(config);
  console.log("Priority: URL params > E-Ra platform > localStorage > defaults");
  return config;
}

// Make debug function available globally
window.debugConfiguration = debugConfiguration;

// Initialize all buttons with loading state, wait for E-Ra data via onValues
document.addEventListener("DOMContentLoaded", function () {
  // Load saved settings first
  loadSettings();

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
