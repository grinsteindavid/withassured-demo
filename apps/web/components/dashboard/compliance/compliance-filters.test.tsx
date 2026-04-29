import { describe, it, expect, mock, beforeEach } from "bun:test";

const push = mock(() => {});

mock.module("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(),
}));

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { ComplianceFilters } = await import("./compliance-filters");

describe("<ComplianceFilters />", () => {
  const providers = [
    { id: "p_1", name: "Dr. Smith" },
    { id: "p_2", name: "Dr. Jones" },
  ];

  beforeEach(() => {
    push.mockClear();
  });

  it("renders all filter dropdowns", () => {
    render(<ComplianceFilters providers={providers} />);

    expect(screen.getByText("All Providers")).toBeTruthy();
    expect(screen.getByText("All Results")).toBeTruthy();
    expect(screen.getByText("All Sources")).toBeTruthy();
    expect(screen.getByText("Clear filters")).toBeTruthy();
  });

  it("renders provider options", () => {
    render(<ComplianceFilters providers={providers} />);

    const providerSelect = screen.getByText("All Providers").closest("select")!;
    expect(providerSelect.querySelector('option[value="p_1"]')?.textContent).toBe("Dr. Smith");
    expect(providerSelect.querySelector('option[value="p_2"]')?.textContent).toBe("Dr. Jones");
  });

  it("navigates with provider filter on change", async () => {
    render(<ComplianceFilters providers={providers} />);

    const providerSelect = screen.getByText("All Providers").closest("select")!;
    await userEvent.selectOptions(providerSelect, "p_1");

    expect(push).toHaveBeenCalledWith(expect.stringContaining("providerId=p_1"));
  });

  it("navigates with result filter on change", async () => {
    render(<ComplianceFilters providers={providers} />);

    const resultSelect = screen.getByText("All Results").closest("select")!;
    await userEvent.selectOptions(resultSelect, "CLEAN");

    expect(push).toHaveBeenCalledWith(expect.stringContaining("result=CLEAN"));
  });

  it("navigates with source filter on change", async () => {
    render(<ComplianceFilters providers={providers} />);

    const sourceSelect = screen.getByText("All Sources").closest("select")!;
    await userEvent.selectOptions(sourceSelect, "OIG");

    expect(push).toHaveBeenCalledWith(expect.stringContaining("source=OIG"));
  });

  it("displays current filter values", () => {
    render(
      <ComplianceFilters
        providers={providers}
        currentProviderId="p_1"
        currentResult="FLAG"
        currentSource="SAM"
      />
    );

    const providerSelect = screen.getByText("All Providers").closest("select") as HTMLSelectElement;
    const resultSelect = screen.getByText("All Results").closest("select") as HTMLSelectElement;
    const sourceSelect = screen.getByText("All Sources").closest("select") as HTMLSelectElement;

    expect(providerSelect.value).toBe("p_1");
    expect(resultSelect.value).toBe("FLAG");
    expect(sourceSelect.value).toBe("SAM");
  });

  it("removes filter param when selecting empty value", async () => {
    render(
      <ComplianceFilters
        providers={providers}
        currentProviderId="p_1"
      />
    );

    const providerSelect = screen.getByText("All Providers").closest("select")!;
    await userEvent.selectOptions(providerSelect, "");

    expect(push).toHaveBeenCalledWith(expect.stringContaining("/dashboard/compliance"));
  });

  it("has clear filters link", () => {
    render(<ComplianceFilters providers={providers} />);

    const clearLink = screen.getByText("Clear filters") as HTMLAnchorElement;
    expect(clearLink.href).toContain("/dashboard/compliance");
  });
});
