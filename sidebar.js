// DOM Elements
const spacesList = document.getElementById('spacesList');
const spaceSwitcher = document.getElementById('spaceSwitcher');
const addSpaceBtn = document.getElementById('addSpaceBtn');
const newTabBtn = document.getElementById('newTabBtn');
const spaceTemplate = document.getElementById('spaceTemplate');

// Global state
let spaces = [];
let activeSpaceId = null;

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
        // Get all existing tab groups
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
            
            // Create default space
            const defaultSpace = {
                id: groupId,
                name: 'Default',
                pinnedTabs: allTabs.filter(tab => tab.pinned).map(tab => tab.id),
                temporaryTabs: allTabs.filter(tab => !tab.pinned).map(tab => tab.id)
            };
            
            // Create bookmark folder for pinned tabs
            await chrome.bookmarks.create({
                parentId: spacesFolder.id,
                title: 'Default'
            });
            
            spaces = [defaultSpace];
            saveSpaces();
            createSpaceElement(defaultSpace);
            setActiveSpace(defaultSpace.id);
        } else {
            // Load existing tab groups as spaces
            spaces = await Promise.all(tabGroups.map(async group => {
                const tabs = await chrome.tabs.query({groupId: group.id});
                return {
                    id: group.id,
                    name: group.title,
                    pinnedTabs: tabs.filter(tab => tab.pinned).map(tab => tab.id),
                    temporaryTabs: tabs.filter(tab => !tab.pinned).map(tab => tab.id)
                };
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
    
    // Update space switcher
    updateSpaceSwitcher();
}

function saveSpaces() {
    console.log('Saving spaces to storage...');
    chrome.storage.local.set({ spaces }, () => {
        console.log('Spaces saved successfully');
    });
}

function setupDragAndDrop(pinnedContainer, tempContainer) {
    console.log('Setting up drag and drop handlers...');
    [pinnedContainer, tempContainer].forEach(container => {
        container.addEventListener('dragover', e => {
            e.preventDefault();
            const draggingElement = document.querySelector('.dragging');
            if (draggingElement) {
                container.appendChild(draggingElement);
            }
        });
    });
}

async function loadTabs(space, pinnedContainer, tempContainer) {
    console.log('Loading tabs for space:', space.id);
    try {
        const tabs = await chrome.tabs.query({});
        space.pinnedTabs.forEach(tabId => {
            const tab = tabs.find(t => t.id === tabId);
            if (tab) {
                const tabElement = createTabElement(tab);
                pinnedContainer.appendChild(tabElement);
            }
        });
        
        space.temporaryTabs.forEach(tabId => {
            const tab = tabs.find(t => t.id === tabId);
            if (tab) {
                const tabElement = createTabElement(tab);
                tempContainer.appendChild(tabElement);
            }
        });
    } catch (error) {
        console.error('Error loading tabs:', error);
    }
}

function createTabElement(tab) {
    console.log('Creating tab element:', tab.id);
    const tabElement = document.createElement('div');
    tabElement.classList.add('tab');
    tabElement.dataset.tabId = tab.id;
    tabElement.draggable = true;
    
    // Add active class if this is the active tab
    if (tab.active) {
        tabElement.classList.add('active');
    }
    
    const favicon = document.createElement('img');
    favicon.src = tab.favIconUrl || 'default-favicon.png';
    favicon.classList.add('tab-favicon');
    
    const title = document.createElement('span');
    title.textContent = tab.title;
    title.classList.add('tab-title');
    
    tabElement.appendChild(favicon);
    tabElement.appendChild(title);
    
    // Add click handler to switch to tab
    tabElement.addEventListener('click', () => {
        // Remove active class from all tabs
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        // Add active class to clicked tab
        tabElement.classList.add('active');
        chrome.tabs.update(tab.id, { active: true });
    });
    
    tabElement.addEventListener('dragstart', () => {
        tabElement.classList.add('dragging');
    });
    
    tabElement.addEventListener('dragend', () => {
        tabElement.classList.remove('dragging');
    });
    
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

async function createNewSpace() {
    console.log('Creating new space... Button clicked');
    try {
        // Create a new tab group
        const groupId = await chrome.tabs.group({});
        await chrome.tabGroups.update(groupId, {title: 'New Space', color: 'grey'});

        const space = {
            id: groupId,
            name: 'New Space',
            pinnedTabs: [],
            temporaryTabs: []
        };
        
        // Create bookmark folder for pinned tabs
        const bookmarkFolders = await chrome.bookmarks.search({title: 'Arc Spaces'});
        if (bookmarkFolders.length > 0) {
            await chrome.bookmarks.create({
                parentId: bookmarkFolders[0].id,
                title: 'New Space'
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
    console.log('Tab created:', tab.id);
    if (activeSpaceId) {
        const space = spaces.find(s => s.id === activeSpaceId);
        if (space) {
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
    }
}

function handleTabUpdate(tabId, changeInfo, tab) {
    console.log('Tab updated:', tabId, changeInfo);
    // Update tab element if it exists
    const tabElement = document.querySelector(`[data-tab-id="${tabId}"]`);
    if (tabElement) {
        if (changeInfo.title) {
            tabElement.querySelector('.tab-title').textContent = changeInfo.title;
        }
        if (changeInfo.favIconUrl) {
            tabElement.querySelector('.tab-favicon').src = changeInfo.favIconUrl || 'default-favicon.png';
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

function handleTabRemove(tabId) {
    console.log('Tab removed:', tabId);
    // Remove tab from spaces
    spaces.forEach(space => {
        space.pinnedTabs = space.pinnedTabs.filter(id => id !== tabId);
        space.temporaryTabs = space.temporaryTabs.filter(id => id !== tabId);
    });
    saveSpaces();
    
    // Remove tab element from DOM
    const tabElement = document.querySelector(`[data-tab-id="${tabId}"]`);
    if (tabElement) {
        tabElement.remove();
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
    // Update active state of all tabs
    document.querySelectorAll('.tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tabId === String(activeInfo.tabId));
    });
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