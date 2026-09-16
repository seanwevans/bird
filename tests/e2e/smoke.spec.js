import { expect, test } from "@playwright/test";

test("boots the simulator and exposes the HUD without console errors", async ({
  page,
}) => {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/");
  await page.waitForTimeout(500);
  expect(errors).toEqual([]);
  await expect(page.locator("#canvas-container canvas")).toBeVisible();

  // The start screen is a modal covering the viewport, so the flight has to be
  // started before anything behind it can be reached. Waiting for it to be
  // hidden also waits out the fade, which keeps hit testing alive until it ends.
  await page.getByRole("button", { name: "TAKE OFF" }).click();
  await expect(page.locator("#start-screen")).toBeHidden();

  await page.getByRole("button", { name: "HUD" }).click();
  await expect(page.locator("#hud-panel")).toBeVisible();
});
