export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  completedBy: string | null;
}

export interface ChecklistState {
  items: ChecklistItem[];
}

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // User IDs of voters
}

export interface PollState {
  options: PollOption[];
}

export interface LiveBlock {
  id: string;
  conversationId: string;
  type: "checklist" | "poll";
  state: ChecklistState & PollState; // Cast as combined type for convenience in widgets
  version: number;
  isFrozen: boolean;
}

export type LiveBlockActionType =
  | "ADD_ITEM"
  | "TOGGLE_ITEM"
  | "REMOVE_ITEM"
  | "ADD_OPTION"
  | "VOTE"
  | "FREEZE";

export interface LiveBlockAction {
  type: LiveBlockActionType;
  payload?: any;
}
