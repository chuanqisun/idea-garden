import { BehaviorSubject } from "rxjs";

export interface IdeaItem {
  id: number;
  title: string;
  description: string;
  favorited?: boolean;
}

export interface ConstraintOption {
  value: string;
  selected?: boolean;
}

export interface Constraint {
  id: number;
  name: string;
  options: ConstraintOption[];
  favorited?: boolean;
}

export const ideas$ = new BehaviorSubject<IdeaItem[]>([]);
export const constraints$ = new BehaviorSubject<Constraint[]>([]);
