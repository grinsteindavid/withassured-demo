import { describe, it, expect, mock, spyOn } from "bun:test";

const push = mock(() => {});
const refresh = mock(() => {});

mock.module("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
  useSearchParams: () => new URLSearchParams(),
}));

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { LogoutButton } = await import("./logout-button");

describe("<LogoutButton />", () => {
  it("renders Sign out label", () => {
    render(<LogoutButton />);
    expect(screen.getByTestId("logout-button")).toHaveTextContent("Sign out");
  });

  it("POSTs /api/auth/logout and navigates to /login on click", async () => {
    const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    );
    push.mockClear();
    refresh.mockClear();

    render(<LogoutButton />);
    await userEvent.click(screen.getByTestId("logout-button"));

    expect(fetchSpy).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
    expect(push).toHaveBeenCalledWith("/login");
    expect(refresh).toHaveBeenCalled();

    fetchSpy.mockRestore();
  });
});
