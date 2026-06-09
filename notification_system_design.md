# Stage 1

## Objective
Generate Top 10 priority notifications.

## Functional Requirements

- Fetch notifications
- Prioritize notifications
- Return Top 10 notifications

## Priority Logic
Placement > Result > Event

Latest notification first within the same category.

## Architecture
Client
|
Notification API
|
Priority Engine
|
Top 10 Output

## Algorithm

1. Fetch notifications
2. Assign priority score
3. Sort by priority
4. Sort by timestamp
5. Select Top 10

## Time Complexity
O(n log n)

## Space Complexity
O(n)

## Logging Strategy

The middleware logs fetch start, successful fetch completion, sorting start, top 10 generation, API failures, and processing failures. Each log uses the reusable `Log(stack, level, packageName, message)` function with `stack` set to `backend` and `packageName` set to `middleware`, `api`, or `utils` depending on the execution step.
