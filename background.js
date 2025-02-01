// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        // Open onboarding page when extension is installed
        chrome.tabs.create({
            url: 'onboarding.html'
        });
    }
});

chrome.action.onClicked.addListener((tab) => {
    chrome.sidePanel.open({ tabId: tab.id }, () => {
        console.log("Side Panel Opened");
    });
});