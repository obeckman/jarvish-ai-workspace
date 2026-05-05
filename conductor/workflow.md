# Workflow Guidelines

## Engineering Standards
- **Component Stability**: No components defined inside other components.
- **Memoization**: Consistent use of `useCallback` and `useMemo` for props.
- **Type Safety**: No `any`, use Zod for validation at boundaries.
- **Separation of Concerns**: Business logic in hooks/services, JSX is declarative.
- **Imports**: Mandatory absolute imports using `@/` alias.

## TDD / Testing
- Prefer empirical reproduction of bugs before fixing.
- Add tests for new features.

## Commit Standards
- Use conventional commits.
- Commit messages should explain "why" and "what".
