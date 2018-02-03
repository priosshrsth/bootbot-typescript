export default function normalize(str: string): string {  return str.replace(/[^a-zA-Z0-9]+/g, '').toUpperCase() };
