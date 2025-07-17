// types/testing-library__jest-dom.d.ts
import '@testing-library/jest-dom';

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toBe(expected: any): R;
      toHaveTextContent(expected: string): R;
      toBeVisible(): R;
      toHaveClass(className: string): R;
      toHaveAttribute(attr: string, value?: string): R;
      toHaveStyle(style: Record<string, any>): R;
      toBeDisabled(): R;
      toBeEnabled(): R;
      toBeChecked(): R;
      toHaveValue(value: any): R;
      toContainElement(element: HTMLElement | null): R;
      toContainHTML(htmlText: string): R;
      toHaveFocus(): R;
    }
  }
}