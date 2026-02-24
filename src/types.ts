export interface Question {
  id: string;
  text: string;
  createdAt: string;
}

export interface SessionData {
  questions: Question[];
  memo: string;
}
