import { BehaviorSubject } from "rxjs";

export interface IdeaItem {
  id: number;
  title: string;
  description: string;
  favorited?: boolean;
}

export interface Constraint {
  id: number;
  name: string;
  value: string;
  options: string[];
  favorited?: boolean;
}

export const ideas$ = new BehaviorSubject<IdeaItem[]>([]);
export const constraints$ = new BehaviorSubject<Constraint[]>([]);
