import { describe, it, expect, mock } from "bun:test";

const push = mock(() => {});

mock.module("next/navigation", () => ({
  default: {
    useRouter: () => ({ push }),
    useSearchParams: () => new URLSearchParams(),
  },
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(),
}));

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { LicenseFilters } = await import("./license-filters");

describe("<LicenseFilters />", () => {
  it("renders filter inputs with correct placeholders", () => {
    render(<LicenseFilters />);
    
    expect(screen.getByPlaceholderText("State (e.g., CA)")).toBeTruthy();
    expect(screen.getByPlaceholderText("Expiring in days")).toBeTruthy();
    expect(screen.getByText("All Statuses")).toBeTruthy();
  });

  it("navigates with state filter on change", async () => {
    push.mockClear();
    
    render(<LicenseFilters currentStatus="ACTIVE" currentState="CA" />);
    
    const stateInput = screen.getByPlaceholderText("State (e.g., CA)");
    await userEvent.type(stateInput, "NY");
    
    expect(push).toHaveBeenLastCalledWith(expect.stringContaining("state=CANY"));
  });

  it("navigates with expiringInDays filter on change", async () => {
    push.mockClear();
    
    render(<LicenseFilters />);
    
    const daysInput = screen.getByPlaceholderText("Expiring in days");
    await userEvent.type(daysInput, "30");
    
    expect(push).toHaveBeenCalledWith(expect.stringContaining("expiringInDays=30"));
  });

  it("navigates with status filter on change", async () => {
    push.mockClear();
    
    render(<LicenseFilters />);
    
    const statusSelect = screen.getByText("All Statuses").closest("select");
    await userEvent.selectOptions(statusSelect!, "EXPIRED");
    
    expect(push).toHaveBeenCalledWith(expect.stringContaining("status=EXPIRED"));
  });

  it("displays current filter values", () => {
    render(
      <LicenseFilters 
        currentStatus="PENDING" 
        currentState="CA" 
        currentExpiringInDays="60" 
      />
    );
    
    const stateInput = screen.getByPlaceholderText("State (e.g., CA)") as HTMLInputElement;
    const daysInput = screen.getByPlaceholderText("Expiring in days") as HTMLInputElement;
    const statusSelect = screen.getByText("All Statuses").closest("select") as HTMLSelectElement;
    
    expect(stateInput.value).toBe("CA");
    expect(daysInput.value).toBe("60");
    expect(statusSelect.value).toBe("PENDING");
  });
});
