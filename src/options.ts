// Default settings
const DEFAULT_SETTINGS = {
    darkMode: false,
    autoCollapseGroups: true,
    showTabPreview: true,
    tabSearch: false,
    smartGroups: false
};

// Get all setting elements
const settingElements = {
    darkMode: document.getElementById('darkMode'),
    autoCollapseGroups: document.getElementById('autoCollapseGroups'),
    showTabPreview: document.getElementById('showTabPreview'),
    tabSearch: document.getElementById('tabSearch'),
    smartGroups: document.getElementById('smartGroups')
};

// Load settings from storage
async function loadSettings() {
    try {
        const result = await chrome.storage.sync.get('settings');
        const settings = result.settings || DEFAULT_SETTINGS;
        
        // Apply settings to UI
        Object.keys(settingElements).forEach(key => {
            if (settingElements[key]) {
                settingElements[key].checked = settings[key];
            }
        });

        // Apply immediate effects
        applySettings(settings);
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// Save settings to storage
async function saveSettings() {
    try {
        const settings = {};
        Object.keys(settingElements).forEach(key => {
            if (settingElements[key]) {
                settings[key] = settingElements[key].checked;
            }
        });

        await chrome.storage.sync.set({ settings });
        
        // Show save confirmation
        const saveStatus = document.getElementById('saveStatus');
        saveStatus.style.display = 'block';
        setTimeout(() => {
            saveStatus.style.display = 'none';
        }, 2000);

        // Apply immediate effects
        applySettings(settings);

        // Notify sidebar of settings change
        chrome.runtime.sendMessage({ type: 'settingsUpdated', settings });
    } catch (error) {
        console.error('Error saving settings:', error);
    }
}

// Apply settings that need immediate effect
function applySettings(settings) {
    // Apply dark mode
    if (settings.darkMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

// Initialize settings page
document.addEventListener('DOMContentLoaded', () => {
    // Load saved settings
    chrome.storage.sync.get({
        darkMode: false,
        autoCollapseGroups: false,
        showTabPreview: true,
        tabSearch: false,
        smartGroups: false
    }, (items) => {
        document.getElementById('darkMode').checked = items.darkMode;
        document.getElementById('autoCollapseGroups').checked = items.autoCollapseGroups;
        document.getElementById('showTabPreview').checked = items.showTabPreview;
        document.getElementById('tabSearch').checked = items.tabSearch;
        document.getElementById('smartGroups').checked = items.smartGroups;
    });

    // Save settings
    document.getElementById('saveSettings').addEventListener('click', () => {
        const settings = {
            darkMode: document.getElementById('darkMode').checked,
            autoCollapseGroups: document.getElementById('autoCollapseGroups').checked,
            showTabPreview: document.getElementById('showTabPreview').checked,
            tabSearch: document.getElementById('tabSearch').checked,
            smartGroups: document.getElementById('smartGroups').checked
        };

        chrome.storage.sync.set(settings, () => {
            const saveStatus = document.getElementById('saveStatus');
            saveStatus.style.display = 'block';
            setTimeout(() => {
                saveStatus.style.display = 'none';
            }, 2000);
        });
    });

    // Add change listeners to all toggles for auto-save
    Object.values(settingElements).forEach(element => {
        if (element) {
            element.addEventListener('change', () => {
                saveSettings();
            });
        }
    });
});

// Listen for settings changes from other parts of the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'settingsUpdated') {
        loadSettings();
    }
}); 