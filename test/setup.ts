import { GlobalRegistrator } from "@happy-dom/global-registrator";
import * as matchers from "@testing-library/jest-dom/matchers";
import { afterEach, expect } from "bun:test";

GlobalRegistrator.register();
expect.extend(matchers as never);

afterEach(() => {
  document.body.innerHTML = "";
});
