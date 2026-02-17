# Gemini Development Guidelines

This document outlines the best practices and conventions to be followed in this project, based on community-accepted standards for React and TypeScript development. The goal is to maintain a high-quality, clean, and maintainable codebase.

## General Principles

*   **Don't Repeat Yourself (DRY):** Avoid duplicating code. Encapsulate and reuse logic in functions, components, or hooks.
*   **Keep It Simple, Stupid (KISS):** Prefer simple, straightforward solutions over complex ones.
*   **Single Responsibility Principle (SRP):** Each component, function, or module should have a single, well-defined responsibility.
*   **Clean Code:** Write code that is easy to read, understand, and maintain. Use meaningful names for variables, functions, and components.
*   **Consistency:** Maintain consistent code style, naming conventions, and file structures across the entire codebase to reduce cognitive load and improve collaboration.

## React Best Practices

### Components

*   **Functional Components:** Prefer functional components with hooks over class-based components.
*   **Component Size:** Keep components small and focused on a single piece of functionality. If a component becomes too large, break it down into smaller, child components.
*   **Naming:** Use `PascalCase` for component names (e.g., `MyComponent`).
*   **Readability:** Prefer function expressions for components for easier readability. Place static values and reusable helpers outside component functions to prevent reinitialization on every render.
*   **`React.FC`:** The use of `React.FC` (or `React.FunctionComponent`) is generally not needed and is even discouraged in newer React and TypeScript versions as it has some drawbacks (e.g., implicit `children` prop).

### Props

*   **Typing:** Always explicitly type props. Define interfaces for complex component props.
*   **Naming:** Use clear and descriptive prop names.
*   **Destructuring:** Destructure props for better readability and to simulate named parameters.
*   **Booleans:** For boolean props, use a shorthand form (e.g., `<MyComponent isVisible />` instead of `<MyComponent isVisible={true} />`).

### State Management

*   **Local State:** Use the `useState` hook for simple, local component state.
*   **Complex State:** For more complex state shared across multiple components, consider using `useReducer` or a state management library (e.g., Zustand, Redux).
*   **State Lifting:** Lift state up to the nearest common ancestor when multiple components need to share it.
*   **Grouped State:** For components with multiple state variables, consider grouping them into a single state object managed by `useReducer` or a custom hook to improve readability and maintainability.

### Hooks

*   **Custom Hooks:** Encapsulate and reuse stateful logic by creating custom hooks (e.g., `useApi`, `useLocalStorage`).
*   **Rules of Hooks:** Adhere strictly to the Rules of Hooks:
    *   Only call hooks at the top level of your functional components or custom hooks.
    *   Don't call hooks inside loops, conditions, or nested functions.

## TypeScript Best Practices

*   **Strong Typing:** Avoid using `any` as much as possible. Provide explicit types for variables, function arguments, and return values.
*   **Interfaces vs. Types:**
    *   Use `interface` for defining the shape of objects and for component props. They are easily extendable.
    *   Use `type` for defining unions, intersections, or more complex types.
*   **Generics:** Use generics to create reusable and type-safe functions and components.
*   **Utility Types:** Leverage built-in utility types like `Partial`, `Pick`, `Omit`, `Record`, etc., to create new types from existing ones.
*   **Immutability:** Embrace `const` assertions for type safety and immutability. Strive for data immutability using `Readonly` and `ReadonlyArray`.
*   **Discriminated Unions:** Use discriminated unions for type safety when dealing with objects that can have different shapes based on a property.
*   **Type Assertions:** Avoid type assertions (`as Type`) in favor of proper type definitions and type guards.
*   **Type Inference:** Explicitly declare types only when it helps to narrow them or in cases where it significantly improves code readability and intent.

## Code Style and Formatting

*   **Linters/Formatters:** Use ESLint and Prettier to enforce consistent code style and formatting automatically.
*   **Naming Conventions:**
    *   **Components, Interfaces, Types:** `PascalCase` (e.g., `MyComponent`, `MyProps`).
    *   **Variables and Functions:** `camelCase` (e.g., `myVariable`, `myFunction`).
    *   **Files and Folders:** `kebab-case` (e.g., `my-component.tsx`).
    *   **Literal Constants:** `UPPER_CASE` (e.g., `MAX_RETRIES`).
*   **File Structure:** Organize files by feature or component. Co-locate related files (e.g., `MyComponent.tsx`, `MyComponent.css`, `types.ts`) in a single folder.
*   **Readability:** Add a blank line before `return` statements to visually separate logic from JSX, improving readability.
*   **Exports:** Prefer named exports over default exports to maintain consistency and avoid potential naming conflicts.

## SCSS and CSS Modules Best Practices

For styling, we use a combination of SCSS for its powerful features (variables, mixins) and CSS Modules for local scope and encapsulation.

### Naming and Structure

*   **File Naming:** Style files should be named `[ComponentName].module.scss`.
*   **Co-location:** Place style files in the same directory as the component they style.
*   **BEM Convention:** While CSS Modules provide scoping, using a BEM-like naming convention for classes (`.block__element--modifier`) can improve readability and structure within a component's styles.
*   **Global Styles:** Global styles (resets, typography, variables) should be kept in separate files in a `styles` or `theme` directory and not be part of a CSS Module.

### SCSS Features

*   **Variables:** Use SCSS variables (`$primary-color`) for colors, fonts, and spacing to ensure consistency.
*   **Mixins and Functions:** Use `@mixin` and `@function` to create reusable style patterns and avoid duplicating code. For example, a mixin for flexbox centering.
*   **Nesting:** Use nesting to reflect the HTML structure, but avoid nesting more than 3 levels deep to prevent overly specific selectors.
*   **`@extend`:** Avoid using `@extend`. It can create complex and hard-to-trace selectors, especially with CSS Modules. Prefer mixins for reusability.

### CSS Modules

*   **`composes`:** Use the `composes` property to share styles between classes. This is a powerful way to create variations of a component.
*   **`:global`:** Use the `:global` keyword sparingly to apply styles to global classes or to elements outside the component's scope.

### Theming

*   **CSS Custom Properties:** For dynamic theming (e.g., light/dark mode), use CSS Custom Properties (variables) defined at the root level. SCSS can be used to set the values of these properties.

### React Integration

*   **`classnames` library:** Use a library like `classnames` or `clsx` to conditionally apply classes in your components. This makes class management cleaner and more readable.

```jsx
import styles from './Button.module.scss';
import classNames from 'classnames';

const Button = ({ primary, children }) => {
  const buttonClasses = classNames(styles.button, {
    [styles.primary]: primary,
  });
  return <button className={buttonClasses}>{children}</button>;
};
```

## Self-Correction and Learning

This document is a living guide. As we learn and adopt new patterns, we will update these guidelines to reflect our best understanding of how to build great software.
