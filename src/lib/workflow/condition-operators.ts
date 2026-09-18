/**
 * Condition operators understood by the Webhooks V2 executor's `evaluateRule`
 * and offered by the Pinggo flow builder's condition node.
 */

export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "greater_than"
  | "greater_than_or_equal"
  | "less_than"
  | "less_than_or_equal"
  | "is_empty"
  | "is_not_empty"
  | "is_true"
  | "is_false"

export const conditionOperatorOptions: { value: ConditionOperator; label: string }[] = [
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "does not equal" },
  { value: "contains", label: "contains" },
  { value: "not_contains", label: "does not contain" },
  { value: "starts_with", label: "starts with" },
  { value: "ends_with", label: "ends with" },
  { value: "greater_than", label: "is greater than" },
  { value: "greater_than_or_equal", label: "is at least" },
  { value: "less_than", label: "is less than" },
  { value: "less_than_or_equal", label: "is at most" },
  { value: "is_not_empty", label: "is present" },
  { value: "is_empty", label: "is empty" },
  { value: "is_true", label: "is true" },
  { value: "is_false", label: "is false" },
]

const VALUELESS_OPERATORS = new Set<string>(["is_empty", "is_not_empty", "is_true", "is_false"])

export function operatorNeedsValue(operator: string): boolean {
  return !VALUELESS_OPERATORS.has(operator)
}

export function isSupportedOperator(operator: string): operator is ConditionOperator {
  return conditionOperatorOptions.some((o) => o.value === operator)
}
