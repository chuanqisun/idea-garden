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
