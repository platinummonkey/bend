chrome.action.onClicked.addListener((tab) => {
    
    // Open Side Panel
    chrome.sidePanel.open({ tabId: tab.id }, () => {
        console.log("Side Panel Opened");
    });
});