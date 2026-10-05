# Vibe-Coded Web App Security Checklist

When building, auditing, or refactoring full-stack web applications generated via rapid AI pair-programming:

1. **Spatial Queries Must Use Bounding Boxes**:
   - Never run `prisma.model.findMany()` with no filter and do in-memory distance calculation in Javascript.
   - Always calculate spatial bounding boxes (`latDelta = radius / 111000`, `lngDelta`) and query indexed coordinate ranges (`gte`, `lte`) in the database `where` clause to prevent heap exhaustion DoS.

2. **Sanitize LLM / Prompt Template Inputs**:
   - Never interpolate raw user inputs directly into prompt template strings.
   - Sanitize all parameters with `sanitizePromptInput()`: strip prompt-hijack directives (`system`, `override`, `instruction`, `ignore`), remove backticks/quotes/delimiters, and enforce character length caps.

3. **Enforce Resource Ownership on Stateful Mutations (BOLA / IDOR Defense)**:
   - For all `POST`, `PUT`, or `DELETE` endpoints accepting a resource ID (e.g., sessions, rides, notifications, journeys), always query the record and verify `record.userId === req.user.userId` before executing mutations (allowing `req.user.role === 'ADMIN'` override).

4. **Pin JWT Algorithms**:
   - In `jwt.verify(token, secret, { algorithms: ['HS256'] })`, explicitly restrict allowed algorithms to prevent algorithm confusion attacks.
   - In `jwt.sign(payload, secret, { algorithm: 'HS256' })`, explicitly specify the signing algorithm.

5. **Strip Markup on User-Submitted Content (Stored XSS Defense)**:
   - Sanitize all user-provided strings in report comments, feedback, or text notes to strip HTML tags (`<...>` regex) before persistence.

6. **Process Crash Safeguards**:
   - Always register global `unhandledRejection` and `uncaughtException` handlers on the root Node.js process to ensure structured logging and prevent unhandled promise aborts.
