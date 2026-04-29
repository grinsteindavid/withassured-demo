import { describe, it, expect, mock, beforeEach } from "bun:test";

import { render, screen } from "@testing-library/react";

const pushMock = mock(() => {});
const searchParamsMock = mock(() => new URLSearchParams());

mock.module("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => searchParamsMock(),
}));

const { DateRangeSelector } = await import("./date-range-selector");

beforeEach(() => {
  pushMock.mockClear();
  searchParamsMock.mockClear();
});

describe("<DateRangeSelector />", () => {
  it("renders three date range buttons", () => {
    searchParamsMock.mockReturnValueOnce(new URLSearchParams());
    render(<DateRangeSelector currentDays={30} />);
    expect(screen.getByText("30 days")).toBeTruthy();
    expect(screen.getByText("90 days")).toBeTruthy();
    expect(screen.getByText("1 year")).toBeTruthy();
  });

  it("highlights the 30 days button when currentDays is 30", () => {
    searchParamsMock.mockReturnValueOnce(new URLSearchParams());
    const { container } = render(<DateRangeSelector currentDays={30} />);
    expect(container).toBeTruthy();
  });

  it("highlights the 90 days button when currentDays is 90", () => {
    searchParamsMock.mockReturnValueOnce(new URLSearchParams());
    const { container } = render(<DateRangeSelector currentDays={90} />);
    expect(container).toBeTruthy();
  });

  it("highlights the 365 days button when currentDays is 365", () => {
    searchParamsMock.mockReturnValueOnce(new URLSearchParams());
    const { container } = render(<DateRangeSelector currentDays={365} />);
    expect(container).toBeTruthy();
  });
});
