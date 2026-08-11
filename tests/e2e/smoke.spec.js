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
  await page.getByRole("button", { name: "HUD" }).click();
  await expect(page.locator("#hud-panel")).toBeVisible();
});
