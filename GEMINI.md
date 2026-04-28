# Gemini Development Guidelines (Enhanced)

This document defines the architectural, performance, and stylistic mandates for this project. Adherence to these standards is non-negotiable for maintaining a high-performance, scalable React + TypeScript codebase.

## 1. Project Structure (Feature-Based)

Organize code by feature/domain rather than by type. This keeps related logic together.

```text
src/
├── assets/          # Static assets (images, fonts, icons)
├── components/      # Shared, reusable UI components (Button, Input, Modal)
├── config/          # App-wide configuration and constants
├── features/        # Feature-specific logic (Auth, Dashboard, Profile)
│   └── feature-name/
│       ├── api/            # Feature-specific API calls
│       ├── components/     # Feature-specific components
│       ├── hooks/          # Feature-specific hooks
│       ├── types/          # Feature-specific types
│       └── utils/          # Feature-specific utils
├── hooks/           # Global, reusable hooks
├── layouts/         # Page layout components
├── pages/           # Components for entire routes
├── services/        # Centralized service logic (API clients, storage)
├── store/           # Global state management
├── styles/          # Global styles, variables, theme
├── types/           # Global type definitions
└── utils/           # Global utility functions
```

## 2. Performance Mandates

Performance is a first-class citizen. Unnecessary re-renders and memory allocations must be minimized.

### 2.1 Component Stability
*   **NEVER** define a component inside another component. This causes the child component to be re-created on every render, leading to full unmounts/remounts of its entire sub-tree.
*   **Factory Patterns:** Factory functions (like `createTabSystem`) must be called **outside** the component's render body or memoized if absolutely necessary (though outside is preferred).

### 2.2 Memoization Strategy
*   **`useCallback`:** Every function passed as a prop to a child component **MUST** be wrapped in `useCallback` to maintain reference equality.
*   **`useMemo`:** Every object or array passed as a prop to a child component (except primitives) **MUST** be wrapped in `useMemo` or defined outside the component.
*   **`React.memo`:** Use `React.memo` for components that:
    1.  Render often with the same props.
    2.  Perform expensive rendering/calculations.
    3.  Receive memoized callbacks or objects from their parent.

### 2.3 JSX Cleanliness
*   Avoid inline object literals and arrow functions in JSX.
    *   *Bad:* `<Button onClick={() => doSomething()} style={{ color: 'red' }} />`
    *   *Good:* `<Button onClick={handleClick} style={BUTTON_STYLE} />`
*   **Event Handler Optimization:** Extract complex logic from event handlers into `useCallback` hooks.
    *   *Bad:*
        ```tsx
        <select onChange={(e) => {
            const item = list.find(i => i.id === e.target.value);
            if (item) doSomething(item);
        }}>
        ```
    *   *Good:*
        ```tsx
        const handleItemChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
            const item = list.find(i => i.id === e.target.value);
            if (item) doSomething(item);
        }, [list, doSomething]);
        
        // ...
        <select onChange={handleItemChange}>
        ```

## 3. TypeScript & Data Integrity

*   **No `any`:** The use of `any` is strictly prohibited. Use `unknown` or proper generic types if the type is truly dynamic.
*   **Zod/Validation:** Use schemas for data entering the system (API responses, local storage) to ensure runtime type safety.
*   **Discriminated Unions:** Use them for complex states (e.g., `Loading | Success | Error`).

## 4. Coding Standards

*   **Separation of Concerns:** Business logic belongs in hooks or services, NOT in the JSX render body. JSX should be a declarative representation of the UI.
*   **DRY vs. AHA:** Avoid premature abstraction. Prefer "Avoid Hasty Abstractions" (AHA). Duplicate code until the common pattern is clear.
*   **Named Exports:** Use named exports exclusively. Default exports lead to inconsistent naming and poor IDE refactoring support.
*   **Logic Separation:** Keep components thin. Move business logic to custom hooks, and data fetching to services/API modules.

## 5. CSS & Styling

*   **CSS Modules:** Use `*.module.scss` for component scoping.
*   **Variables:** Always use CSS variables or SCSS variables for colors, spacing, and typography. No hardcoded hex codes.
*   **No Inline Styles:** Inline `style={{ ... }}` attributes in JSX are strictly prohibited. All styles must be defined in the corresponding SCSS module file.

## 6. Constant Management & Zero Magic Strings

Enforce strict constant management throughout the codebase to ensure maintainability and type safety.

### 6.1 The Rule
Every string, configuration value, or hardcoded literal must be extracted into a constant or enum. Use `as const` for all object or array-based constants to ensure literal type safety.

### 6.2 Placement Logic (Locality of Concern)
*   **Feature-Specific:** If a constant is used only within a specific feature, place a `constants.ts` file directly inside that feature folder.
*   **Shared/Domain:** If a constant is shared across multiple related components or features, place it in the nearest parent directory common to all consumers (e.g., `src/features/shared/constants.ts`).
*   **Global:** Only truly global app-wide values (API base URLs, app names) should reside in a root-level `src/constants/` or `src/config/` directory.

### 6.3 Implementation Pattern
Always favor named exports for constants:
```tsx
export const API_ENDPOINTS = {
  GRAPHQL: '/graphql',
  STORAGE: '/api/storage',
} as const;
```
## 7. Absolute Imports Mandate

Relative imports (using `./` or `../`) are strictly **FORBIDDEN**. All imports must use absolute paths relative to the project root or via configured path aliases.

*   **Pattern:** Use the `@/` prefix to refer to the `src/` directory.
*   **Example:**
    *   *Bad:* `import { Button } from '../../components/shared/Button';`
    *   *Good:* `import { Button } from '@/components/shared/Button';`
*   **Rationale:** Absolute imports make code easier to move, refactor, and understand by providing clear context of where a module resides within the project structure.
