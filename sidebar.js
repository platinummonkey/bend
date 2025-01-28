// DOM Elements
const spacesList = document.getElementById('spacesList');
const spaceSwitcher = document.getElementById('spaceSwitcher');
const addSpaceBtn = document.getElementById('addSpaceBtn');
const newTabBtn = document.getElementById('newTabBtn');
const spaceTemplate = document.getElementById('spaceTemplate');

// Global state
let spaces = [];
let activeSpaceId = null;

// Helper function to generate UUID
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Helper function to update bookmark for a tab
async function updateBookmarkForTab(tab) {
    const bookmarkFolders = await chrome.bookmarks.search({title: 'Arc Spaces'});
    if (bookmarkFolders.length > 0) {
        const spaceFolders = await chrome.bookmarks.getChildren(bookmarkFolders[0].id);
        for (const spaceFolder of spaceFolders) {
            const bookmarks = await chrome.bookmarks.getChildren(spaceFolder.id);
            const bookmark = bookmarks.find(b => b.url === tab.url);
            if (bookmark) {
                await chrome.bookmarks.update(bookmark.id, {
                    title: tab.title,
                    url: tab.url
                });
            }
        }
    }
}

console.log("hi");

// Initialize the sidebar when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing sidebar...');
    initSidebar();

    // Add Chrome tab event listeners
    chrome.tabs.onCreated.addListener(handleTabCreated);
    chrome.tabs.onUpdated.addListener(handleTabUpdate);
    chrome.tabs.onRemoved.addListener(handleTabRemove);
    chrome.tabs.onMoved.addListener(handleTabMove);
    chrome.tabs.onActivated.addListener(handleTabActivated);
});

async function initSidebar() {
    console.log('Initializing sidebar...');
    try {
        const tabGroups = await chrome.tabGroups.query({});
        const allTabs = await chrome.tabs.query({});
        
        // Create bookmarks folder for spaces if it doesn't exist
        const bookmarkFolders = await chrome.bookmarks.search({title: 'Arc Spaces'});
        let spacesFolder;
        if (bookmarkFolders.length === 0) {
            spacesFolder = await chrome.bookmarks.create({title: 'Arc Spaces'});
        } else {
            spacesFolder = bookmarkFolders[0];
        }

        if (tabGroups.length === 0) {
            // Create default tab group and move all tabs to it
            const groupId = await chrome.tabs.group({tabIds: allTabs.map(tab => tab.id)});
            await chrome.tabGroups.update(groupId, {title: 'Default', color: 'grey'});
            
            // Create default space with UUID
            const defaultSpace = {
                id: groupId,
                uuid: generateUUID(),
                name: 'Default',
                pinnedTabs: [],
                temporaryTabs: allTabs.filter(tab => !tab.pinned).map(tab => tab.id)
            };
            
            // Create bookmark folder for pinned tabs using UUID
            await chrome.bookmarks.create({
                parentId: spacesFolder.id,
                title: defaultSpace.id
            });
            
            spaces = [defaultSpace];
            saveSpaces();
            createSpaceElement(defaultSpace);
            setActiveSpace(defaultSpace.id);
        } else {
            const result = await chrome.storage.local.get('spaces');
            console.log("local storage", result);
            // Load existing tab groups as spaces
            spaces = await Promise.all(tabGroups.map(async group => {
                const tabs = await chrome.tabs.query({groupId: group.id});
                console.log("processing group", group);
                const pinnedTabs = result.spaces.find(s => s.id === group.id)?.pinnedTabs || [];
                console.log("pinned tabs", pinnedTabs);
                const space = {
                    id: group.id,
                    uuid: generateUUID(),
                    name: group.title,
                    pinnedTabs: pinnedTabs,
                    temporaryTabs: tabs.map(tab => tab.id)
                };

                // Create bookmark folder for the space if it doesn't exist
                const spaceFolder = spacesFolder.children?.find(f => f.title === space.id);
                if (!spaceFolder) {
                    await chrome.bookmarks.create({
                        parentId: spacesFolder.id,
                        title: ""+space.id
                    });
                }

                return space;
            }));
            spaces.forEach(space => createSpaceElement(space));
            setActiveSpace(spaces[0].id);
        }
    } catch (error) {
        console.error('Error initializing sidebar:', error);
    }

    // Add event listeners for buttons
    addSpaceBtn.addEventListener('click', createNewSpace);
    newTabBtn.addEventListener('click', createNewTab);
}

function createSpaceElement(space) {
    console.log('Creating space element for:', space.id);
    const spaceElement = spaceTemplate.content.cloneNode(true);
    const spaceContainer = spaceElement.querySelector('.space');
    spaceContainer.dataset.spaceId = space.id;
    spaceContainer.style.display = space.id === activeSpaceId ? 'block' : 'none';
    spaceContainer.dataset.spaceUuid = space.id;

    // Set up space name input
    const nameInput = spaceElement.querySelector('.space-name');
    nameInput.value = space.name;
    nameInput.addEventListener('change', () => {
        space.name = nameInput.value;
        saveSpaces();
        updateSpaceSwitcher();
    });

    // Set up containers
    const pinnedContainer = spaceElement.querySelector('[data-tab-type="pinned"]');
    const tempContainer = spaceElement.querySelector('[data-tab-type="temporary"]');

    // Set up drag and drop
    setupDragAndDrop(pinnedContainer, tempContainer);

    // Set up clean tabs button
    const cleanBtn = spaceElement.querySelector('.clean-tabs-btn');
    cleanBtn.addEventListener('click', () => cleanTemporaryTabs(space.id));

    // Set up options menu
    const optionsBtn = spaceElement.querySelector('.space-options');
    optionsBtn.addEventListener('click', () => {
        if (confirm('Delete this space and close all its tabs?')) {
            deleteSpace(space.id);
        }
    });

    // Load tabs
    loadTabs(space, pinnedContainer, tempContainer);

    // Add to DOM
    spacesList.appendChild(spaceElement);
}

function updateSpaceSwitcher() {
    console.log('Updating space switcher...');
    spaceSwitcher.innerHTML = '';
    spaces.forEach(space => {
        const button = document.createElement('button');
        button.textContent = space.name;
        button.classList.toggle('active', space.id === activeSpaceId);
        button.addEventListener('click', () => setActiveSpace(space.id));
        spaceSwitcher.appendChild(button);
    });
}

function setActiveSpace(spaceId) {
    console.log('Setting active space:', spaceId);
    activeSpaceId = spaceId;
    
    // Update UI to reflect active space
    document.querySelectorAll('.space').forEach(spaceElement => {
        const isActive = spaceElement.dataset.spaceId === String(spaceId);
        spaceElement.classList.toggle('active', isActive);
        spaceElement.style.display = isActive ? 'block' : 'none';
    });

    // Get the currently active tab from Chrome
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
            const activeTab = tabs[0];
            // Remove active class from all tabs
            document.querySelectorAll('.tab').forEach(t => {
                t.classList.remove('active');
                // Add active class only to the currently active tab in the current space
                if (t.dataset.tabId === String(activeTab.id) && 
                    t.closest('.space').dataset.spaceId === String(spaceId)) {
                    t.classList.add('active');
                }
            });
        }
    });
    
    // Update space switcher
    updateSpaceSwitcher();
}

function saveSpaces() {
    console.log('Saving spaces to storage...');
    chrome.storage.local.set({ spaces }, () => {
        console.log('Spaces saved successfully');
    });
}

async function setupDragAndDrop(pinnedContainer, tempContainer) {
    console.log('Setting up drag and drop handlers...');
    [pinnedContainer, tempContainer].forEach(container => {
        container.addEventListener('dragover', e => {
            e.preventDefault();
            const draggingElement = document.querySelector('.dragging');
            if (draggingElement) {
                container.appendChild(draggingElement);
                
                // Handle tab being moved to pinned section
                if (container.dataset.tabType === 'pinned' && draggingElement.dataset.tabId) {
                    console.log("dragged");
                    const tabId = parseInt(draggingElement.dataset.tabId);
                    chrome.tabs.get(tabId, async (tab) => {
                        const spaceId = container.closest('.space').dataset.spaceId;
                        const space = spaces.find(s => s.id === parseInt(spaceId));
                        
                        if (space && tab) {
                            // Move tab from temporary to pinned in space data
                            space.temporaryTabs = space.temporaryTabs.filter(id => id !== tabId);
                            if (!space.pinnedTabs.includes(tabId)) {
                                space.pinnedTabs.push(tabId);
                            }
                            
                            // Add to bookmarks if URL doesn't exist
                            const bookmarkFolders = await chrome.bookmarks.search({title: 'Arc Spaces'});
                            if (bookmarkFolders.length > 0) {
                                const spaceFolders = await chrome.bookmarks.getChildren(bookmarkFolders[0].id);
                                const spaceFolder = spaceFolders.find(f => f.title === ""+space.id);
                                if (spaceFolder) {
                                    // Check if bookmark with same URL exists
                                    const bookmarks = await chrome.bookmarks.getChildren(spaceFolder.id);
                                    const existingBookmark = bookmarks.find(b => b.url === tab.url);
                                    if (!existingBookmark) {
                                        await chrome.bookmarks.create({
                                            parentId: spaceFolder.id,
                                            title: tab.title,
                                            url: tab.url
                                        });
                                    }
                                }
                            }
                            
                            saveSpaces();
                        }
                    });
                }
            }
        });
    });
}

async function loadTabs(space, pinnedContainer, tempContainer) {
    console.log('Loading tabs for space:', space.id);
    console.log('Pinned tabs in space:', space.pinnedTabs);
    try {
        const tabs = await chrome.tabs.query({});
        const bookmarkFolders = await chrome.bookmarks.search({title: 'Arc Spaces'});
        
        if (bookmarkFolders.length > 0) {
            const spaceFolders = await chrome.bookmarks.getChildren(bookmarkFolders[0].id);
            const spaceFolder = spaceFolders.find(f => f.title === ""+space.id);
            
            if (spaceFolder) {
                // Load pinned tabs from bookmarks
                const bookmarks = await chrome.bookmarks.getChildren(spaceFolder.id);
                
                console.log('Loading active pinned tabs from bookmarks...', bookmarks);
                // First, handle active pinned tabs
                for (const tabId of space.pinnedTabs) {
                    const tab = tabs.find(t => t.id === tabId);
                    console.log('Checking if active pinned tab exists:', tab);
                    if (tab) {
                        // Only create tab element if bookmark exists for this URL
                        const existingBookmark = bookmarks.find(b => b.url === tab.url);
                        if (existingBookmark) {
                            console.log('Creating UI element for active pinned tab:', tab.id, tab.title);
                            const tabElement = createTabElement(tab, true);
                            pinnedContainer.appendChild(tabElement);
                        }
                    }
                }
                
                console.log('Loading inactive pinned tabs from bookmarks...');
                // Then, handle inactive pinned tabs from bookmarks
                for (const bookmark of bookmarks) {
                    // Only create element if there's no active tab with this URL
                    const activeTab = tabs.find(t => t.url === bookmark.url && space.pinnedTabs.includes(t.id));
                    if (!activeTab) {
                        const bookmarkTab = {
                            id: null,
                            title: bookmark.title,
                            url: bookmark.url,
                            favIconUrl: null,
                            spaceName: space.name
                        };
                        console.log('Creating UI element for inactive pinned tab from bookmark:', bookmark.title);
                        const tabElement = createTabElement(bookmarkTab, true, true);
                        pinnedContainer.appendChild(tabElement);
                    }
                }
            }
        }
        
        // Load temporary tabs
        space.temporaryTabs.forEach(tabId => {
            console.log("checking", tabId);
            const pinned = space.pinnedTabs.find(t => t == tabId);
            console.log("pinned", pinned);
            const tab = tabs.find(t => t.id === tabId);
            if (tab && pinned == null) {
                const tabElement = createTabElement(tab);
                tempContainer.appendChild(tabElement);
            }
        });
    } catch (error) {
        console.error('Error loading tabs:', error);
    }
}

function createTabElement(tab, isPinned = false, isBookmarkOnly = false) {
    console.log('Creating tab element:', tab.id);
    const tabElement = document.createElement('div');
    tabElement.classList.add('tab');
    if (!isBookmarkOnly) {
        tabElement.dataset.tabId = tab.id;
        tabElement.draggable = true;
        
        // Add active class if this is the active tab
        if (tab.active) {
            tabElement.classList.add('active');
        }
    } else {
        tabElement.classList.add('inactive');
        tabElement.dataset.url = tab.url;
    }
    
    const favicon = document.createElement('img');
    favicon.src = tab.favIconUrl || 'assets/default_icon.png';
    favicon.classList.add('tab-favicon');
    
    const title = document.createElement('span');
    title.textContent = tab.title;
    title.classList.add('tab-title');
    
    const actionButton = document.createElement('button');
    actionButton.classList.add(isBookmarkOnly ? 'tab-remove' : 'tab-close');
    actionButton.innerHTML = isBookmarkOnly ? '-' : '×';
    actionButton.addEventListener('click', async (e) => {
        e.stopPropagation(); // Prevent tab activation when closing
        
        if (isBookmarkOnly) {
            // Remove from bookmarks
            const bookmarkFolders = await chrome.bookmarks.search({title: 'Arc Spaces'});
            if (bookmarkFolders.length > 0) {
                const spaceFolders = await chrome.bookmarks.getChildren(bookmarkFolders[0].id);
                const spaceFolder = spaceFolders.find(f => f.title === tab.spaceName);
                if (spaceFolder) {
                    const bookmarks = await chrome.bookmarks.getChildren(spaceFolder.id);
                    const bookmark = bookmarks.find(b => b.url === tab.url);
                    if (bookmark) {
                        await chrome.bookmarks.remove(bookmark.id);
                        tabElement.remove();
                    }
                }
            }
        } else {
            chrome.tabs.remove(tab.id);
        }
    });
    
    tabElement.appendChild(favicon);
    tabElement.appendChild(title);
    tabElement.appendChild(actionButton);
    
    // Add click handler
    tabElement.addEventListener('click', async () => {
        if (isBookmarkOnly) {
            // Create new tab with bookmark URL
            const newTab = await chrome.tabs.create({ url: tab.url, active: true });
            if (isPinned) {
                const space = spaces.find(s => s.name === tab.spaceName);
                if (space) {
                    space.pinnedTabs.push(newTab.id);
                    saveSpaces();
                }
            }
        } else {
            // Remove active class from all tabs
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            tabElement.classList.add('active');
            chrome.tabs.update(tab.id, { active: true });
        }
    });
    
    if (!isBookmarkOnly) {
        tabElement.addEventListener('dragstart', () => {
            tabElement.classList.add('dragging');
        });
        
        tabElement.addEventListener('dragend', () => {
            tabElement.classList.remove('dragging');
        });
    }
    
    return tabElement;
}

function createNewTab() {
    console.log('Creating new tab...');
    chrome.tabs.create({ active: true }, async (tab) => {
        if (activeSpaceId) {
            await chrome.tabs.group({tabIds: tab.id, groupId: activeSpaceId});
            const space = spaces.find(s => s.id === activeSpaceId);
            if (space) {
                space.temporaryTabs.push(tab.id);
                saveSpaces();
            }
        }
    });
}

let isCreatingSpace = false;

async function createNewSpace() {
    console.log('Creating new space... Button clicked');
    isCreatingSpace = true;
    try {
        // First create a new tab
        const newTab = await new Promise((resolve, reject) => {
            chrome.tabs.create({ active: true }, (tab) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(tab);
                }
            });
        });

        // Create a new tab group with the new tab
        const groupId = await chrome.tabs.group({ tabIds: [newTab.id] });
        await chrome.tabGroups.update(groupId, { title: 'New Space', color: 'grey' });

        const space = {
            id: groupId,
            uuid: generateUUID(),
            name: 'New Space',
            pinnedTabs: [],
            temporaryTabs: [newTab.id]
        };
        
        // Create bookmark folder for pinned tabs using UUID
        const bookmarkFolders = await chrome.bookmarks.search({title: 'Arc Spaces'});
        if (bookmarkFolders.length > 0) {
            await chrome.bookmarks.create({
                parentId: bookmarkFolders[0].id,
                title: space.id
            });
        }
        
        spaces.push(space);
        console.log('New space created:', { spaceId: space.id, spaceName: space.name });
        
        createSpaceElement(space);
        updateSpaceSwitcher();
        setActiveSpace(space.id);
        saveSpaces();
    } catch (error) {
        console.error('Error creating new space:', error);
    } finally {
        isCreatingSpace = false;
    }
}

function cleanTemporaryTabs(spaceId) {
    console.log('Cleaning temporary tabs for space:', spaceId);
    const space = spaces.find(s => s.id === spaceId);
    if (space) {
        space.temporaryTabs.forEach(tabId => {
            chrome.tabs.remove(tabId);
        });
        space.temporaryTabs = [];
        saveSpaces();
    }
}

function handleTabCreated(tab) {
    if (isCreatingSpace) {
        console.log('Skipping tab creation handler - space is being created');
        return;
    }
    console.log('Tab created:', tab.id);
    // Always ensure we have the current activeSpaceId
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        try {
            // Get the current active tab's group ID
            // const currentGroupId = await chrome.tabs.group({ tabIds: tab.id });
            const space = spaces.find(s => s.id === activeSpaceId);
            
            if (space) {
                // Move the tab to the active space's group
                await chrome.tabs.group({ tabIds: tab.id, groupId: space.id });
                
                // Add the new tab to the current space's temporary tabs
                space.temporaryTabs.push(tab.id);
                saveSpaces();

                // Create and add the tab element to the temporary container
                const spaceElement = document.querySelector(`[data-space-id="${activeSpaceId}"]`);
                if (spaceElement) {
                    const tempContainer = spaceElement.querySelector('[data-tab-type="temporary"]');
                    const tabElement = createTabElement(tab);
                    tempContainer.appendChild(tabElement);

                    // Update active state of all tabs
                    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                    tabElement.classList.add('active');
                }
            }
        } catch (error) {
            console.error('Error handling new tab:', error);
        }
    });
}


function handleTabUpdate(tabId, changeInfo, tab) {
    console.log('Tab updated:', tabId, changeInfo, spaces);
    // Update tab element if it exists
    const tabElement = document.querySelector(`[data-tab-id="${tabId}"]`);
    if (tabElement) {
        if (changeInfo.title) {
            tabElement.querySelector('.tab-title').textContent = changeInfo.title;
            // Update bookmark title if this is a pinned tab
            if (tabElement.closest('[data-tab-type="pinned"]')) {
                updateBookmarkForTab(tab);
            }
        }
        if (changeInfo.favIconUrl) {
            tabElement.querySelector('.tab-favicon').src = changeInfo.favIconUrl || 'assets/default_icon.png';
        }
        if (changeInfo.url) {
            // Update bookmark URL if this is a pinned tab
            if (tabElement.closest('[data-tab-type="pinned"]')) {
                updateBookmarkForTab(tab);
            }
        }
        // Update active state when tab's active state changes
        if (changeInfo.active !== undefined) {
            if (changeInfo.active) {
                // Remove active class from all tabs
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                // Add active class to this tab
                tabElement.classList.add('active');
            }
        }
    }
}

async function handleTabRemove(tabId) {
    console.log('Tab removed:', tabId);
    // Get tab element before removing it
    const tabElement = document.querySelector(`[data-tab-id="${tabId}"]`);
    if (!tabElement) return;
    
    const isPinned = tabElement.closest('[data-tab-type="pinned"]');
    
    // Remove tab from spaces
    spaces.forEach(space => {
        space.pinnedTabs = space.pinnedTabs.filter(id => id !== tabId);
        space.temporaryTabs = space.temporaryTabs.filter(id => id !== tabId);
    });
    
    // If it was a pinned tab, convert it to an inactive bookmark tab
    if (isPinned) {
        const space = spaces.find(s => s.id === parseInt(tabElement.closest('.space').dataset.spaceId));
        if (space) {
            const bookmarkFolders = await chrome.bookmarks.search({title: 'Arc Spaces'});
            if (bookmarkFolders.length > 0) {
                const spaceFolders = await chrome.bookmarks.getChildren(bookmarkFolders[0].id);
                const spaceFolder = spaceFolders.find(f => f.title === space.name);
                if (spaceFolder) {
                    const bookmarks = await chrome.bookmarks.getChildren(spaceFolder.id);
                    const bookmark = bookmarks.find(b => b.url === tabElement.dataset.url);
                    if (bookmark) {
                        // Create an inactive bookmark tab element
                        const bookmarkTab = {
                            id: null,
                            title: bookmark.title,
                            url: bookmark.url,
                            favIconUrl: null,
                            spaceName: space.name
                        };
                        const inactiveTabElement = createTabElement(bookmarkTab, true, true);
                        tabElement.replaceWith(inactiveTabElement);
                        return;
                    }
                }
            }
        }
    }
    
    // If not a pinned tab or bookmark not found, remove the element
    tabElement?.remove();
    saveSpaces();
    
    // Remove tab element from DOM
    const newTabElement = document.querySelector(`[data-tab-id="${tabId}"]`);
    if (newTabElement) {
        newTabElement.remove();
    }
}

function handleTabMove(tabId, moveInfo) {
    console.log('Tab moved:', tabId, moveInfo);
    // Update tab position in DOM if needed
    const tabElement = document.querySelector(`[data-tab-id="${tabId}"]`);
    if (tabElement) {
        const container = tabElement.parentElement;
        const tabs = Array.from(container.children);
        const currentIndex = tabs.indexOf(tabElement);
        if (currentIndex !== moveInfo.toIndex) {
            container.insertBefore(tabElement, container.children[moveInfo.toIndex]);
        }
    }
}

function handleTabActivated(activeInfo) {
    console.log('Tab activated:', activeInfo.tabId);
    // Find which space contains this tab
    const spaceWithTab = spaces.find(space => 
        space.pinnedTabs.includes(activeInfo.tabId) || 
        space.temporaryTabs.includes(activeInfo.tabId)
    );

    if (spaceWithTab && spaceWithTab.id !== activeSpaceId) {
        // Switch to the space containing the tab
        setActiveSpace(spaceWithTab.id);
    } else {
        // Just update the active state of tabs in the current space
        document.querySelectorAll('.tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tabId === String(activeInfo.tabId));
        });
    }
}

function deleteSpace(spaceId) {
    console.log('Deleting space:', spaceId);
    const space = spaces.find(s => s.id === spaceId);
    if (space) {
        // Close all tabs in the space
        [...space.pinnedTabs, ...space.temporaryTabs].forEach(tabId => {
            chrome.tabs.remove(tabId);
        });

        // Remove space from array
        spaces = spaces.filter(s => s.id !== spaceId);

        // Remove space element from DOM
        const spaceElement = document.querySelector(`[data-space-id="${spaceId}"]`);
        if (spaceElement) {
            spaceElement.remove();
        }

        // If this was the active space, switch to another space
        if (activeSpaceId === spaceId && spaces.length > 0) {
            setActiveSpace(spaces[0].id);
        }

        // Save changes
        saveSpaces();
        updateSpaceSwitcher();
    }
}