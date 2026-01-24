export type StyleAction =
  | { type: 'bold' }
  | { type: 'italic' }
  | { type: 'increaseSize' }
  | { type: 'decreaseSize' }
  | { type: 'color'; index: number };
