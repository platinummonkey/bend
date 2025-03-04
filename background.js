// Configure Chrome side panel behavior
chrome.sidePanel.setPanelBehavior({
    openPanelOnActionClick: true
}).catch(error => console.error(error));


// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        chrome.tabs.create({ url: 'onboarding.html', active: true }, async (tab) => {
            const tabGroups = await chrome.tabGroups.query({});
            const defaultGroup = tabGroups.find(group => group.title === 'Home');
            if (defaultGroup) {
                console.log("found existing default group", defaultGroup);
                // Move ungrouped tabs to existing Default group
                await chrome.tabs.group({tabIds: tab.id, groupId: defaultGroup.id});
            } else {
                // Create new Default group
                defaultGroupId = await chrome.tabs.group({tabIds: tab.id});
                await chrome.tabGroups.update(defaultGroupId, {title: 'Home', color: 'grey'});
            }
        });
    }
    if (chrome.contextMenus) {
        chrome.contextMenus.create({
            id: "openArcify",
            title: "Arcify",
            contexts: ["all"]
        });
    }
});

// Handle context menu clicks
if (chrome.contextMenus) {
    chrome.contextMenus.onClicked.addListener((info, tab) => {
        info.menuItemId === "openArcify" && chrome.sidePanel.open({
            windowId: tab.windowId
        })
    });
}

chrome.commands.onCommand.addListener(function(command) {
    if (command === "quickPinToggle") {
        console.log("sending");
        // Send a message to the sidebar
        chrome.runtime.sendMessage({ command: "quickPinToggle" });
    }
});
