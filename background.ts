// Open the side panel when the action button is clicked
chrome.action.onClicked.addListener((tab) => {
    chrome.sidePanel.open({ tabId: tab.id })
  })
  
  // Initialize storage with default spaces if not already set
  chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(["spaces", "currentSpace"], (result) => {
      if (!result.spaces) {
        const defaultSpaces = {
          personal: {
            name: "Personal",
            emoji: "👤",
            tabs: [],
            folders: [
              {
                id: "folder-1",
                name: "Example Folder",
                tabs: [{ id: "tab-1", title: "Example Tab", url: "https://example.com", favicon: "" }],
                expanded: true,
              },
            ],
          },
        }
  
        chrome.storage.local.set({
          spaces: defaultSpaces,
          currentSpace: "personal",
          pinnedTabs: [],
        })
      }
    })
  })
  
  // Listen for tab updates to sync with our storage
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url && !tab.url.startsWith("chrome://")) {
      updateCurrentTabs()
    }
  })
  
  // Update the list of current tabs
  function updateCurrentTabs() {
    chrome.tabs.query({}, (tabs) => {
      const currentTabs = tabs.map((tab) => ({
        id: `current-${tab.id}`,
        title: tab.title || "New Tab",
        url: tab.url || "",
        favicon: tab.favIconUrl || "",
        tabId: tab.id,
      }))
  
      chrome.storage.local.set({ currentTabs })
    })
  }
  
  // Initialize current tabs when extension loads
  updateCurrentTabs()
  