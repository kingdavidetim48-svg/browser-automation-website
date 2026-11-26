const SENSITIVE_KEY_PATTERN =
  /api[-_]?key|secret|token|password|passwd|authorization|cookie|credential|private[-_]?key|session[-_]?id/i

const SENSITIVE_STRING_PATTERNS: RegExp[] = [
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
  /\b(sk|pk|rk|re|bb|tr|whsec)_(live|test|dev|prod)?_[A-Za-z0-9]{8,}/g,
  /\b(sk|re|bb|tr)_[A-Za-z0-9]{16,}/g,
]

export function redactString(value: string): string {
  let result = value
  for (const pattern of SENSITIVE_STRING_PATTERNS) {
    result = result.replace(pattern, "[REDACTED]")
  }
  return result
}

export function redactSensitiveData<T>(value: T, depth = 0): T {
  if (depth > 10 || value == null) return value

  if (typeof value === "string") {
    return redactString(value) as T
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveData(item, depth + 1)) as T
  }

  if (typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        out[key] = "[REDACTED]"
      } else {
        out[key] = redactSensitiveData(val, depth + 1)
      }
    }
    return out as T
  }

  return value
}
