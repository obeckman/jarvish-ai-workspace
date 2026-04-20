---
name: google-api-integration
description: Integrate Google Workspace APIs (Gmail, Calendar, Docs) using a stateless token-passing architecture. Use when Gemini CLI needs to implement features that read or search user data from Google services.
---

# Google API Integration

## Overview

This skill provides a standardized workflow for adding read-only access to Google Workspace services (Gmail, Calendar, Docs) into full-stack applications. It prioritizes security and simplicity by using a stateless architecture that avoids server-side secret management.

## Core Patterns

### 1. Stateless Authentication
Avoid storing long-lived refresh tokens or client secrets on the backend. Instead, the frontend obtains a temporary `access_token` and passes it to the server.
- See [stateless-auth.md](references/stateless-auth.md) for implementation details.

### 2. Transient Tool Execution
Create Google API clients on-the-fly within agent tool execution functions.
- Use [google_tools_boilerplate.ts](assets/google_tools_boilerplate.ts) as a starting point.

## Workflow Decision Tree

1.  **Does the task require reading Gmail, Calendar, or Docs?**
    - Yes: Proceed with this skill.
    - No: Use general API integration patterns.
2.  **Is the Google SDK loaded?**
    - No: Add the script tag to `index.html`.
3.  **Define Tool Declarations**
    - Map Google API methods to Gemini `FunctionDeclaration` objects.
4.  **Implement Execution Logic**
    - Extract `x-google-token` from headers and use it to authorize the Google client.

## Example Triggers

- "Help me add a Gmail search feature to my Jarvish agent."
- "I want the agent to be able to see my upcoming calendar events."
- "How do I read the content of a Google Doc using Gemini function calling?"

## Resources

### references/
- **stateless-auth.md**: Comprehensive guide on the stateless token-passing architecture.

### assets/
- **google_tools_boilerplate.ts**: Boilerplate for Gmail tool declarations and execution.
