export interface IdeaItem {
  id: number;
  title: string;
  description: string;
}

export interface Constraint {
  id: number;
  name: string;
  value: string;
  options: string[];
}
