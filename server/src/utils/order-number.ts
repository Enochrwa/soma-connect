import { nanoid } from "nanoid";

export function makeOrderNumber() {
  return `SM-${new Date().getFullYear()}${(new Date().getMonth() + 1)
    .toString()
    .padStart(2, "0")}-${nanoid(6).toUpperCase()}`;
}
