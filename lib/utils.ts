import { clsx, type ClassValue } from "clsx"

function twMerge(value: string) {
  return value
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}