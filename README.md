# Campus Notifications Microservice Stage 1

## Project Overview

This repository contains the Stage 1 Node.js solution for the campus notifications assessment. It fetches notifications, ranks them by priority, and writes the top 10 results in a screenshot-ready format.

## Setup Instructions

1. Install Node.js 18 or later.
2. Ensure `ACCESS_TOKEN` is available in the environment.
3. Run the Stage 1 script from the repository root.

## Run Instructions

```bash
npm run stage1
```

The script writes the result to `stage1/output/top_10_notifications.md` and prints the same table to the console.

## Output Example

```md
| ID | Type | Message | Timestamp |
| --- | --- | --- | --- |
| sample-id | Placement | Sample message | 2026-04-22 17:51:30 |
```

## Folder Structure

- `logging_middleware/logger.js`
- `stage1/app.js`
- `stage1/notifications.js`
- `stage1/output/`
- `Notification_System_Design.md`
- `README.md`
- `package.json`
- `.gitignore`

## Assumptions

- The notification API returns a JSON payload with a `notifications` array.
- Records contain `ID`, `Type`, `Message`, and `Timestamp` fields.
- Priority order is Placement, Result, then Event.
