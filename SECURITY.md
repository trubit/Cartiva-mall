# TrusonShopp Platform — Security Documentation

## Security Architecture & Controls

TrusonShopp Mall strictly adheres to **OWASP Top 10**, **OWASP ASVS**, **NIST SSDF**, and **Zero Trust Architecture** principles.

---

## Key Controls Implemented

### 1. Authentication & Authorization

- **Access Control**: Role-Based Access Control (RBAC) with support for `admin`, `seller`, `vendor`, and `customer` roles.
- **Tokens**: Short-lived JWT Access Tokens (15 min) + Refresh Tokens (7 days) stored in HttpOnly, SameSite cookies.
- **Multi-Factor Authentication (MFA)**: TOTP-based MFA (speakeasy + QRCode) for administrative and privileged accounts.
- **Session Audit**: Session tracking in MongoDB with active session revocation capabilities.

### 2. Input Validation & Data Protection

- **Validation**: Strict Zod schema validation on all API requests (Body, Query, Params).
- **Sanitization**: Prevention of SQL/NoSQL Injection, XSS, and Path Traversal vulnerabilities.
- **Password Hashing**: bcrypt with standard salt rounds.

### 3. API Gateway & Network Security

- **Rate Limiting**: Distributed rate limiting using `express-rate-limit` with Redis store fallback.
- **Security Headers**: Helmet configured with Content Security Policy (CSP), X-Content-Type-Options, Referrer-Policy, and X-Frame-Options.
- **CORS**: Restricted to explicitly allowed origin (`CLIENT_URL`).
- **Secrets Management**: Zero hardcoded secrets in repository code; all keys sourced from environment variables.

### 4. AI & Autonomous Governance Security (Phase 29)

- **Deterministic Execution**: God-Mode AI Economic Brain uses deterministic rule-based algorithms with database signal inputs.
- **Auditability**: Every AI decision and rule modification is stored with version history and reversible parameters.
- **No Direct Shell Access**: AI cannot execute shell commands or bypass IAM authorization checks.
