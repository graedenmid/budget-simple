# Component Development Rules

## Component Architecture

### File Structure

```
components/
├── ui/                 # Shadcn/ui components
├── forms/             # Form components
├── dashboard/         # Dashboard-specific components
├── budget/            # Budget management components
├── income/            # Income management components
├── expenses/          # Expense tracking components
└── common/            # Shared utility components
```

### Naming Conventions

- Use PascalCase for component names
- Use kebab-case for file names
- Suffix with component type: `BudgetItemCard.tsx`, `ExpenseForm.tsx`
- Use descriptive names that indicate purpose

### Component Structure Template

```typescript
import { ComponentProps } from "react";

interface ComponentNameProps {
  // Define all props with explicit types
  required: string;
  optional?: number;
  children?: React.ReactNode;
}

export function ComponentName({
  required,
  optional,
  children,
  ...props
}: ComponentNameProps) {
  // Component logic here

  return <div {...props}>{children}</div>;
}
```

## Component Guidelines

### Props and TypeScript

- Always define explicit interfaces for props
- Use optional properties with `?` when appropriate
- Extend HTML element props when wrapping native elements
- Use `React.ComponentProps<'element'>` for element prop inheritance

### State Management

- Use `useState` for simple local state
- Use `useReducer` for complex state with multiple related values
- Lift state up when multiple components need access
- Use Context API sparingly, only for truly global state

### Event Handling

- Use descriptive function names: `handleSubmit`, `handleInputChange`
- Keep event handlers close to where they're used
- Use useCallback for handlers passed to child components
- Prevent default and stop propagation when appropriate

### Form Components

- Use controlled components for all form inputs
- Implement proper validation with clear error messages
- Use React Hook Form for complex forms
- Provide loading and disabled states

### Error Handling

- Implement error boundaries for component trees
- Use try-catch in async operations
- Provide fallback UI for error states
- Show user-friendly error messages

## Styling Rules

### Tailwind CSS

- Use Tailwind utility classes for all styling
- Group related classes: layout, spacing, colors, typography
- Use responsive prefixes: `sm:`, `md:`, `lg:`, `xl:`
- Create custom CSS classes only when necessary

### Responsive Design

- Design mobile-first, then enhance for larger screens
- Use Tailwind responsive prefixes consistently
- Test on multiple screen sizes
- Consider touch targets for mobile (min 44px)

### Accessibility

- Use semantic HTML elements
- Implement proper ARIA attributes
- Ensure keyboard navigation works
- Provide alt text for images
- Use proper heading hierarchy

## Performance Optimization

### React.memo

- Use React.memo for components that receive stable props
- Compare props carefully in custom comparison functions
- Don't overuse - profile first to identify bottlenecks

### Hooks Optimization

- Use useMemo for expensive calculations
- Use useCallback for functions passed to child components
- Don't optimize prematurely - measure first

### Code Splitting

- Use dynamic imports for large components
- Implement lazy loading for routes
- Split vendor bundles appropriately

## Testing

### Component Testing

- Test component behavior, not implementation details
- Use React Testing Library
- Test user interactions and state changes
- Mock external dependencies

### Test Structure

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { ComponentName } from "./ComponentName";

describe("ComponentName", () => {
  it("should render with required props", () => {
    render(<ComponentName required="test" />);
    expect(screen.getByText("test")).toBeInTheDocument();
  });

  it("should handle user interaction", () => {
    const handleClick = jest.fn();
    render(<ComponentName onClick={handleClick} />);

    fireEvent.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalled();
  });
});
```

## Specific Component Types

### Form Components

- Always use controlled inputs
- Implement proper validation
- Provide clear error states
- Handle loading states during submission

### List Components

- Always provide unique keys for list items
- Implement virtualization for large lists
- Handle empty states gracefully
- Provide loading skeletons

### Modal/Dialog Components

- Use proper focus management
- Implement escape key handling
- Provide accessible close buttons
- Handle backdrop clicks appropriately

### Dashboard Components

- Load data efficiently with proper caching
- Implement skeleton loading states
- Handle error states with retry options
- Use responsive layouts for different screen sizes
