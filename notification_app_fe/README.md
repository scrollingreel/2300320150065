# Stage 2 React Frontend

## Overview

This folder contains the Stage 2 React frontend for the campus notifications assessment. It uses React in the browser with Material UI styling, supports notification type filtering, server-side pagination, and runs on port 3000.

## Setup

1. Make sure the access token is present in `.env`.

## Run

```bash
npm run dev
```

The app runs on `http://localhost:3000`.

## Features

- Fetch notifications from the evaluation API
- Filter by `notification_type`
- Paginate with `limit` and `page`
- Responsive Material UI layout
- Desktop table view and mobile card view
