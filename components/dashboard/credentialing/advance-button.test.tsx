import { describe, it, expect, mock, spyOn } from "bun:test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const refresh = mock(() => {});

mock.module("next/navigation", () => ({
  useRouter: () => ({ refresh, push: () => {} }),
}));

const { AdvanceButton } = await import("./advance-button");

describe("<AdvanceButton />", () => {
  it("renders Advance step label", () => {
    render(<AdvanceButton workflowId="cred_x" />);
    expect(screen.getByTestId("advance-button")).toHaveTextContent("Advance step");
  });

  it("POSTs the dev advance endpoint with the workflow id and refreshes", async () => {
    const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 204 }),
    );
    refresh.mockClear();

    render(<AdvanceButton workflowId="cred_42" />);
    await userEvent.click(screen.getByTestId("advance-button"));

    expect(fetchSpy).toHaveBeenCalledWith("/api/_dev/workflows/cred_42/advance", { method: "POST" });
    expect(refresh).toHaveBeenCalled();

    fetchSpy.mockRestore();
  });
});
