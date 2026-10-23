export type User = {
  uid: string;
  email: string;
  displayName: string;
  nickname: string;
  photoURL?: string;
  createdAt: string;
  lastLogin: string;
};

export type Space = {
  id: string;
  users: string[]; // UIDs of the two users
  inviteCode?: string;
};

export type BookStatus = 'reading' | 'completed' | 'planned';

export type BookQuote = {
  text: string;
  sourceUrl: string;
  sourceTitle: string;
};

export type BookQuoteLookup = {
  key: string;
  status: 'ready' | 'not_found' | 'error';
  quotes: BookQuote[];
  checkedAt: string;
};

export type Book = {
  id: string;
  spaceId: string;
  title: string;
  author: string;
  isbn?: string;
  googleBooksId?: string;
  coverImage?: string;
  publisher?: string;
  publishedDate?: string;
  description?: string;
  pageCount?: number;
  categories?: string[];
  language?: string;
  status: BookStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  deletedAt?: string;
  quoteLookup?: BookQuoteLookup | null;
};

export type DiscussionRecord = {
  id: string;
  bookId: string;
  content: string;
  updatedAt: string;
  updatedBy: string; // UID of the last editor
  isEditing?: string; // UID of the user currently editing (Soft Lock)
  deletedAt?: string;
};

export type AnalysisResult = {
  id: string;
  recordId: string;
  user1Thought: string;
  user2Thought: string;
  sharedSummary: string;
  updatedAt: string;
};

export type Reflection = {
  id: string;
  bookId: string;
  question: string;
  content: string; // raw text for this reflection
  updatedAt: string;
};

export type ThoughtFlowCurrent = {
  summary: string;
  startAt: string;
  updatedAt: string;
  analyzedThrough: string;
};

export type ThoughtFlowHistory = {
  id: string;
  summary: string;
  startAt: string;
  endAt: string;
  createdAt: string;
  kind?: 'import';
  title?: string;
  eventDate?: string;
  dateEvidence?: string;
  sourceExcerpt?: string;
  sourceNames?: string[];
  importedBy?: string;
  updatedAt?: string;
  mergedInto?: string;
  thoughts?: PersonThought[];
  materials?: FlowMaterial[];
  currentSummary?: string;
};

export type PersonThought = { name: string; thought: string };
export type FlowMaterial = { id: string; authorNames: string; sourceExcerpt: string; dateEvidence: string; sourceNames: string[]; createdAt: string };

export type FlowImportDraft = {
  title: string;
  summary: string;
  eventDate: string | null;
  dateEvidence: string;
  sourceExcerpt: string;
  thoughts?: PersonThought[];
  currentSummary?: string;
};
