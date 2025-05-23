/// <reference types="chrome"/>

export interface Space {
  id: number;
  uuid: string;
  name: string;
  emoji?: string;
  color: chrome.tabGroups.ColorEnum;
  spaceBookmarks: chrome.bookmarks.BookmarkTreeNode[];
  temporaryTabs: number[];
}

export interface TabElement extends HTMLElement {
  dataset: {
    tabId: string;
    spaceId?: string;
  };
}

export interface SpaceElement extends HTMLElement {
  dataset: {
    spaceId: string;
    uuid: string;
  };
}

export enum MouseButton {
  LEFT = 0,
  MIDDLE = 1,
  RIGHT = 2
}

export interface SpaceCreateOptions {
  name?: string;
  color?: chrome.tabGroups.ColorEnum;
}

export interface BookmarkTreeNode extends chrome.bookmarks.BookmarkTreeNode {
  id: string;
  url?: string;
} 