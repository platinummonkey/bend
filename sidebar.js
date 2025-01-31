// DOM Elements
const spacesList = document.getElementById('spacesList');
const spaceSwitcher = document.getElementById('spaceSwitcher');
const addSpaceBtn = document.getElementById('addSpaceBtn');
const newTabBtn = document.getElementById('newTabBtn');
const spaceTemplate = document.getElementById('spaceTemplate');

// Global state
let spaces = [];
let activeSpaceId = null;
let isCreatingSpace = false;
let isOpeningBookmark = false;
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
    console.log("updating tab", tab);
    const bookmarkFolders = await chrome.bookmarks.search({title: 'Arc Spaces'});
    if (bookmarkFolders.length > 0) {
        const spaceFolders = await chrome.bookmarks.getChildren(bookmarkFolders[0].id);
        for (const spaceFolder of spaceFolders) {
            console.log("looking for space folder", spaceFolder);
            const bookmarks = await chrome.bookmarks.getChildren(spaceFolder.id);
            console.log("looking for bookmarks", bookmarks);
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

// Function to update pinned favicons
async function updatePinnedFavicons() {
    const pinnedFavicons = document.getElementById('pinnedFavicons');
    const pinnedTabs = await chrome.tabs.query({ pinned: true });

    // Remove favicon elements for tabs that are no longer pinned
    Array.from(pinnedFavicons.children).forEach(element => {
        const tabId = element.dataset.tabId;
        if (!pinnedTabs.some(tab => tab.id.toString() === tabId)) {
            element.remove();
        }
    });

    pinnedTabs.forEach(tab => {
        // Check if favicon element already exists for this tab
        const existingElement = pinnedFavicons.querySelector(`[data-tab-id="${tab.id}"]`);
        if (!existingElement) {
            const faviconElement = document.createElement('div');
            faviconElement.className = 'pinned-favicon';
            faviconElement.title = tab.title;
            faviconElement.dataset.tabId = tab.id;

            const img = document.createElement('img');
            img.src = tab.favIconUrl || 'assets/default_icon.png';
            img.alt = tab.title;

            faviconElement.appendChild(img);
            faviconElement.addEventListener('click', () => {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.pinned-favicon').forEach(t => t.classList.remove('active'));
                // Add active class to clicked tab
                faviconElement.classList.add('active');
                chrome.tabs.update(tab.id, { active: true });
            });

            pinnedFavicons.appendChild(faviconElement);
        }
    });
}

// Initialize the sidebar when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing sidebar...');
    initSidebar();
    updatePinnedFavicons(); // Initial load of pinned favicons

    // Add Chrome tab event listeners
    chrome.tabs.onCreated.addListener(handleTabCreated);
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        handleTabUpdate(tabId, changeInfo, tab);
        if (tab.pinned) updatePinnedFavicons(); // Update favicons when a tab is pinned/unpinned
    });
    chrome.tabs.onRemoved.addListener(handleTabRemove);
    chrome.tabs.onMoved.addListener(handleTabMove);
    chrome.tabs.onActivated.addListener(handleTabActivated);
});

async function initSidebar() {
    console.log('Initializing sidebar...');
    try {
        const tabGroups = await chrome.tabGroups.query({});
        const allTabs = await chrome.tabs.query({});
        console.log("tabGroups", tabGroups);
        console.log("allTabs", allTabs);
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
                spaceBookmarks: [],
                temporaryTabs: allTabs.filter(tab => !tab.pinned).map(tab => tab.id)
            };

            // Create bookmark folder for space bookmarks using UUID
            await chrome.bookmarks.create({
                parentId: spacesFolder.id,
                title: defaultSpace.name
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
                const spaceBookmarks = result.spaces.find(s => s.name == group.title)?.spaceBookmarks || [];
                console.log("space bookmarks", spaceBookmarks);
                const space = {
                    id: group.id,
                    uuid: generateUUID(),
                    name: group.title,
                    spaceBookmarks: spaceBookmarks,
                    temporaryTabs: tabs.map(tab => tab.id)
                };
                chrome.bookmarks.getSubTree(spacesFolder.id, async mainFolder => {
                     // Create bookmark folder for the space if it doesn't exist
                    const bookmarkFolder = mainFolder[0].children?.find(f => f.title == space.name);
                    console.log("looking for existing folder", mainFolder, bookmarkFolder);
                    if (!bookmarkFolder) {
                        console.log("creating new folder")
                        await chrome.bookmarks.create({
                            parentId: spacesFolder.id,
                            title: space.name
                        });
                    }
                })

                return space;
            }));
            spaces.forEach(space => createSpaceElement(space));
            setActiveSpace(spaces[0].id);
        }
    } catch (error) {
        console.error('Error initializing sidebar:', error);
    }

    // Add event listeners for buttons
    addSpaceBtn.addEventListener('click', () => {
    const inputContainer = document.getElementById('addSpaceInputContainer');
    const spaceSwitcher = document.getElementById('spaceSwitcher');
    const spaceNameInput = document.getElementById('newSpaceName');
    const isInputVisible = inputContainer.classList.contains('visible');
    
    // Toggle visibility classes
    inputContainer.classList.toggle('visible');
    addSpaceBtn.classList.toggle('active');
    
    // Toggle space switcher visibility
    if (isInputVisible) {
        spaceSwitcher.style.opacity = '1';
        spaceSwitcher.style.visibility = 'visible';
    } else {
        spaceNameInput.value = '';
        spaceSwitcher.style.opacity = '0';
        spaceSwitcher.style.visibility = 'hidden';
    }
});
    document.getElementById('createSpaceBtn').addEventListener('click', createNewSpace);
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
    nameInput.addEventListener('change', async () => {

        // Update bookmark folder name
        const bookmarkFolders =  await chrome.bookmarks.search({title: 'Arc Spaces'});
        const oldName = space.name;
        if (bookmarkFolders.length > 0) {
            console.log("updating bookmark folder name", bookmarkFolders, oldName);
            await chrome.bookmarks.getSubTree(bookmarkFolders[0].id, async mainFolder => {
                console.log("mainFolder", mainFolder);
                // Create bookmark folder for the space if it doesn't exist
               const bookmarkFolder = mainFolder[0].children?.find(f => f.title == oldName);
               console.log("finding folder", bookmarkFolder);
               if (bookmarkFolder) {
                    await chrome.bookmarks.update(bookmarkFolder.id, {title: nameInput.value});
                }
            });
        }

        const tabGroups = await chrome.tabGroups.query({});
        const tabGroupForSpace = tabGroups.find(group => group.id === space.id);
        console.log("updating tabGroupForSpace", tabGroupForSpace);
        if (tabGroupForSpace) {
            await chrome.tabGroups.update(tabGroupForSpace.id, {title: nameInput.value, color: 'grey'});
        }

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
                            if (!space.spaceBookmarks.includes(tabId)) {
                                space.spaceBookmarks.push(tabId);
                            }

                            // Add to bookmarks if URL doesn't exist
                            const bookmarkFolders = await chrome.bookmarks.search({title: 'Arc Spaces'});
                            if (bookmarkFolders.length > 0) {
                                const spaceFolders = await chrome.bookmarks.getChildren(bookmarkFolders[0].id);
                                const spaceFolder = spaceFolders.find(f => f.title == space.name);
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
    console.log('Space bookmarks in space:', space.spaceBookmarks);
    try {
        const tabs = await chrome.tabs.query({});
        const bookmarkFolders = await chrome.bookmarks.search({title: 'Arc Spaces'});

        if (bookmarkFolders.length > 0) {
            const spaceFolders = await chrome.bookmarks.getChildren(bookmarkFolders[0].id);
            const spaceFolder = spaceFolders.find(f => f.title == space.name);

            if (spaceFolder) {
                // Load space bookmarks from bookmarks
                const bookmarks = await chrome.bookmarks.getChildren(spaceFolder.id);

                console.log('Loading active space bookmarks from bookmarks...', bookmarks);
                var bookmarkedTabURLs= [];
                for (const bookmark of bookmarks) {
                    const existingBookmark = tabs.find(t => t.url == bookmark.url);
                    if (existingBookmark) {
                        console.log('Creating UI element for active space bookmark:', existingBookmark);
                        bookmarkedTabURLs.push(existingBookmark.url);
                        const tabElement = createTabElement(existingBookmark, true);
                        pinnedContainer.appendChild(tabElement);
                    }
                }

                // First, handle active space bookmarks
                // for (const tabId of space.spaceBookmarks) {
                //     const tab = tabs.find(t => t.id === tabId);
                //     console.log('Checking if active space bookmark exists:', tab);
                //     if (tab) {
                //         // Only create tab element if bookmark exists for this URL
                //         const existingBookmark = bookmarks.find(b => b.url === tab.url);
                //         if (existingBookmark) {
                //             console.log('Creating UI element for active space bookmark:', tab.id, tab.title);
                //             const tabElement = createTabElement(tab, true);
                //             pinnedContainer.appendChild(tabElement);
                //         }
                //     }
                // }

                console.log('Loading inactive space bookmarks from bookmarks...');
                // Then, handle inactive space bookmarks from bookmarks
                for (const bookmark of bookmarks) {
                    // Only create element if there's no active tab with this URL
                    const activeTab = tabs.find(t => t.url == bookmark.url);
                    if (!activeTab) {
                        const bookmarkTab = {
                            id: null,
                            title: bookmark.title,
                            url: bookmark.url,
                            favIconUrl: null,
                            spaceName: space.name
                        };
                        console.log('Creating UI element for inactive space bookmark from bookmark:', bookmark.title);
                        const tabElement = createTabElement(bookmarkTab, true, true);
                        bookmarkedTabURLs.push(bookmark.url);

                        pinnedContainer.appendChild(tabElement);
                    }
                }


            }
        }

        // Load temporary tabs
        space.temporaryTabs.forEach(tabId => {
            console.log("checking", tabId, spaces);
            const tab = tabs.find(t => t.id === tabId);
            const pinned = bookmarkedTabURLs.find(url => url == tab.url);
            console.log("pinned", pinned);

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
        console.log('Closing tab:', tab);

        // If last tab is closed, create a new empty tab to prevent tab group from closing
        const tabsInGroup = await chrome.tabs.query({ groupId: activeSpaceId });
        console.log("tabsInGroup", tabsInGroup);
        if (tabsInGroup.length < 2) {
            console.log("creating new tab");
            await createNewTab(async () => {
                if (isBookmarkOnly) {
                    // Remove from bookmarks
                    const bookmarkFolders = await chrome.bookmarks.search({title: 'Arc Spaces'});
                    if (bookmarkFolders.length > 0) {
                        const spaceFolders = await chrome.bookmarks.getChildren(bookmarkFolders[0].id);
                        const activeSpace = spaces.find(s => s.id === activeSpaceId);

                        const spaceFolder = spaceFolders.find(f => f.title === activeSpace.name);
                        console.log("spaceFolder", spaceFolder);
                        if (spaceFolder) {
                            const bookmarks = await chrome.bookmarks.getChildren(spaceFolder.id);
                            const bookmark = bookmarks.find(b => b.url === tab.url);
                            if (bookmark) {
                                console.log("removing bookmark", bookmark);
                                await chrome.bookmarks.remove(bookmark.id);
                                tabElement.remove();
                            }
                        }
                    }
                } else if (isPinned) {
                    const bookmarkFolders = await chrome.bookmarks.search({title: 'Arc Spaces'});
                    if (bookmarkFolders.length > 0) {
                        const spaceFolders = await chrome.bookmarks.getChildren(bookmarkFolders[0].id);
                        const activeSpace = spaces.find(s => s.id === activeSpaceId);

                        const spaceFolder = spaceFolders.find(f => f.title === activeSpace.name);
                        console.log("spaceFolder", spaceFolder);
                        if (spaceFolder) {
                            const bookmarkTab = {
                                id: null,
                                title: tab.title,
                                url: tab.url,
                                favIconUrl: tab.favIconUrl,
                                spaceName: tab.spaceName
                            };
                            const inactiveTabElement = createTabElement(bookmarkTab, true, true);
                            tabElement.replaceWith(inactiveTabElement);

                            chrome.tabs.remove(tab.id);
                            return;
                        }
                    }
                } else {
                    chrome.tabs.remove(tab.id);
                }
            });
            return;
        }

        if (isBookmarkOnly) {
            // Remove from bookmarks
            const bookmarkFolders = await chrome.bookmarks.search({title: 'Arc Spaces'});
            if (bookmarkFolders.length > 0) {
                const spaceFolders = await chrome.bookmarks.getChildren(bookmarkFolders[0].id);
                const activeSpace = spaces.find(s => s.id === activeSpaceId);

                const spaceFolder = spaceFolders.find(f => f.title === activeSpace.name);
                console.log("spaceFolder", spaceFolder);
                if (spaceFolder) {
                    const bookmarks = await chrome.bookmarks.getChildren(spaceFolder.id);
                    const bookmark = bookmarks.find(b => b.url === tab.url);
                    if (bookmark) {
                        console.log("removing bookmark", bookmark);
                        await chrome.bookmarks.remove(bookmark.id);
                        tabElement.remove();
                    }
                }
            }
        } else if (isPinned) {
            const bookmarkFolders = await chrome.bookmarks.search({title: 'Arc Spaces'});
            if (bookmarkFolders.length > 0) {
                const spaceFolders = await chrome.bookmarks.getChildren(bookmarkFolders[0].id);
                const activeSpace = spaces.find(s => s.id === activeSpaceId);

                const spaceFolder = spaceFolders.find(f => f.title === activeSpace.name);
                console.log("spaceFolder", spaceFolder);
                if (spaceFolder) {
                    const bookmarkTab = {
                        id: null,
                        title: tab.title,
                        url: tab.url,
                        favIconUrl: tab.favIconUrl,
                        spaceName: tab.spaceName
                    };
                    const inactiveTabElement = createTabElement(bookmarkTab, true, true);
                    tabElement.replaceWith(inactiveTabElement);

                    chrome.tabs.remove(tab.id);
                    return;
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
        // Remove active class from all tabs
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.pinned-favicon').forEach(t => t.classList.remove('active'));

        if (isBookmarkOnly) {
            console.log('Opening bookmark:', tab.url);
            isOpeningBookmark = true;
            // Create new tab with bookmark URL
            const newTab = await chrome.tabs.create({ url: tab.url, active: true });

            console.log("newTab", newTab);
            const bookmarkTab = {
                id: newTab.id,
                title: tab.title,
                url: tab.url,
                favIconUrl: tab.favIconUrl,
                spaceName: tab.spaceName
            };
            const activeBookmark = createTabElement(bookmarkTab, true, false);
            activeBookmark.classList.add('active');

            console.log("activeBookmark", activeBookmark);
            tabElement.replaceWith(activeBookmark);

            await chrome.tabs.group({ tabIds: newTab.id, groupId: activeSpaceId });


            isOpeningBookmark = false;
            // if (isPinned) {
            //     const space = spaces.find(s => s.name === tab.spaceName);
            //     if (space) {
            //         space.spaceBookmarks.push(newTab.id);
            //         saveSpaces();
            //     }
            // }
        } else {
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

function createNewTab(callback = () => {}) {
    console.log('Creating new tab...');
    chrome.tabs.create({ active: true }, async (tab) => {
        console.log('activeSpaceId', activeSpaceId);
        if (activeSpaceId) {
            await chrome.tabs.group({tabIds: tab.id, groupId: activeSpaceId});
            const space = spaces.find(s => s.id === activeSpaceId);
            if (space) {
                space.temporaryTabs.push(tab.id);
                saveSpaces();
                callback();
            }
        }
    });
}

function showSpaceNameInput() {
    const addSpaceBtn = document.getElementById('addSpaceBtn');
    const addSpaceInputContainer = document.getElementById('addSpaceInputContainer');

    addSpaceBtn.classList.toggle('active');
    addSpaceInputContainer.classList.toggle('visible');
    const errorPopup = document.createElement('div');
    errorPopup.className = 'error-popup';
    errorPopup.textContent = 'A space with this name already exists';
    const inputContainer = document.getElementById('addSpaceInputContainer');
    inputContainer.appendChild(errorPopup);
    
    // Remove the error message after 3 seconds
    setTimeout(() => {
        errorPopup.remove();
    }, 3000);
    return;
}

// Add input validation for new space name
document.getElementById('newSpaceName').addEventListener('input', (e) => {
    const createSpaceBtn = document.getElementById('createSpaceBtn');
    createSpaceBtn.disabled = !e.target.value.trim();
});

async function createNewSpace() {
    console.log('Creating new space... Button clicked');
    isCreatingSpace = true;
    try {
        const spaceNameInput = document.getElementById('newSpaceName');
        const spaceName = spaceNameInput.value.trim();

        if (!spaceName || spaces.some(space => space.name.toLowerCase() === spaceName.toLowerCase())) {
            const errorPopup = document.createElement('div');
            errorPopup.className = 'error-popup';
            errorPopup.textContent = 'A space with this name already exists';
            const inputContainer = document.getElementById('addSpaceInputContainer');
            inputContainer.appendChild(errorPopup);
            
            // Remove the error message after 3 seconds
            setTimeout(() => {
                errorPopup.remove();
            }, 3000);
            return;
        }

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
        await chrome.tabGroups.update(groupId, { title: spaceName, color: 'grey' });

        const space = {
            id: groupId,
            uuid: generateUUID(),
            name: spaceName,
            spaceBookmarks: [],
            temporaryTabs: [newTab.id]
        };

        // Create bookmark folder for pinned tabs using UUID
        const bookmarkFolders = await chrome.bookmarks.search({title: 'Arc Spaces'});
        if (bookmarkFolders.length > 0) {
            // Check if bookmark folder with this space name already exists
            const spaceFolders = await chrome.bookmarks.getChildren(bookmarkFolders[0].id);
            const spaceFolder = spaceFolders.find(f => f.title === space.name);

            if (!spaceFolder) {
                // Create a new bookmark folder for this space
                await chrome.bookmarks.create({
                    parentId: bookmarkFolders[0].id,
                    title: space.name
                });
            }
        }

        spaces.push(space);
        console.log('New space created:', { spaceId: space.id, spaceName: space.name });

        createSpaceElement(space);
        updateSpaceSwitcher();
        setActiveSpace(space.id);
        saveSpaces();

        isCreatingSpace = false;
        // Reset the space creation UI and show space switcher
        const addSpaceBtn = document.getElementById('addSpaceBtn');
        const inputContainer = document.getElementById('addSpaceInputContainer');
        const spaceSwitcher = document.getElementById('spaceSwitcher');
        addSpaceBtn.classList.remove('active');
        inputContainer.classList.remove('visible');
        spaceSwitcher.style.opacity = '1';
        spaceSwitcher.style.visibility = 'visible';
    } catch (error) {
        console.error('Error creating new space:', error);
    } finally {

    }
}

function cleanTemporaryTabs(spaceId) {
    console.log('Cleaning temporary tabs for space:', spaceId);
    const space = spaces.find(s => s.id === spaceId);
    if (space) {
        console.log("space.temporaryTabs", space.temporaryTabs);

        // iterate through temporary tabs and remove them with index
        space.temporaryTabs.forEach((tabId, index) => {
            if (index == space.temporaryTabs.length - 1) {
                createNewTab();
            }
            chrome.tabs.remove(tabId);
        });

        space.temporaryTabs = [];
        saveSpaces();
    }
}

function handleTabCreated(tab) {
    if (isCreatingSpace || isOpeningBookmark) {
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
                    document.querySelectorAll('.pinned-favicon').forEach(t => t.classList.remove('active'));

                    tabElement.classList.add('active');
                }

                // switch to the new tab
                await chrome.tabs.update(tab.id, { active: true })
            }
        } catch (error) {
            console.error('Error handling new tab:', error);
        }
    });
}


function handleTabUpdate(tabId, changeInfo, tab) {
    if (isOpeningBookmark) {
        return;
    }
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
                document.querySelectorAll('.pinned-favicon').forEach(t => t.classList.remove('active'));

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
    console.log("tabElement", tabElement);
    const activeSpace = spaces.find(s => s.id === activeSpaceId);
    console.log("activeSpace", activeSpace);
    const isPinned = activeSpace.spaceBookmarks.find(id => id === tabId) != null;
    console.log("isPinned", isPinned);


    // Remove tab from spaces
    spaces.forEach(space => {
        space.spaceBookmarks = space.spaceBookmarks.filter(id => id !== tabId);
        space.temporaryTabs = space.temporaryTabs.filter(id => id !== tabId);
    });

    // If last tab is closed, create a new empty tab to prevent tab group from closing
    // const tabsInGroup = await chrome.tabs.query({ groupId: activeSpaceId });
    // if (tabsInGroup.length < 2) {
    //     createNewTab();
    // }

    // If not a pinned tab or bookmark not found, remove the element
    tabElement?.remove();


    saveSpaces();

    // // Remove tab element from DOM
    // const newTabElement = document.querySelector(`[data-tab-id="${tabId}"]`);
    // if (newTabElement) {
    //     newTabElement.remove();
    // }
}

function handleTabMove(tabId, moveInfo) {
    if (isOpeningBookmark) {
        return;
    }
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
        space.spaceBookmarks.includes(activeInfo.tabId) ||
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
        [...space.spaceBookmarks, ...space.temporaryTabs].forEach(tabId => {
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
