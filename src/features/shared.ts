export type Navigate = (path: string) => void

export function optionLabel<T extends string>(options: Array<{ value: T; label: string }>, value: T) {
  return options.find(option => option.value === value)?.label ?? value;
}

export function toggleSelection<T>(values: T[], value: T, checked: boolean) {
  return checked
    ? values.includes(value) ? values : [...values, value]
    : values.filter(current => current !== value);
}

export function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error && err.message ? err.message : fallback;
}
