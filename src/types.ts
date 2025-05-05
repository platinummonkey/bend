export interface Tab {
    id: string
    title: string
    url: string
    favicon: string
    tabId?: number
  }
  
  export interface PinnedTab {
    id: string
    title: string
    url: string
    favicon: string
  }
  
  export interface Folder {
    id: string
    name: string
    tabs: Tab[]
    expanded: boolean
    folders?: Folder[]
  }
  
  export interface Space {
    name: string
    emoji: string
    tabs: Tab[]
    folders: Folder[]
  }
  
  export enum DragItemTypes {
    TAB = "tab",
    FOLDER = "folder",
  }
  
  export interface DragItem {
    type: string
    id: string
    spaceId: string
    folderId?: string
    index: number
  }
  