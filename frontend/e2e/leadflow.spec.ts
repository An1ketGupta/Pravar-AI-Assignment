import { test, expect } from "@playwright/test";
import path from "node:path";
import { mkdir } from "node:fs/promises";

const screenshots = path.resolve(import.meta.dirname, "../../docs/screenshots");

test("complete CRM flow, immediate updates, filters, persistence and mobile layout", async ({ page }) => {
  await mkdir(screenshots, { recursive: true });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await page.screenshot({ path: path.join(screenshots, "01-sign-in.png"), fullPage: true });
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Full name" })).toBeVisible();
  await page.getByRole("button", { name: "Open local preview" }).click();
  await expect(page.getByRole("button", { name: "Open Sarah Connor" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open Sarah Connor" })).toHaveCount(1);
  await expect(page.locator(".today-section")).toContainText("Sarah Connor");
  await expect(page.getByRole("button", { name: "Open Bill Lumbergh" })).toContainText("Overdue");
  await page.screenshot({ path: path.join(screenshots, "02-dashboard.png"), fullPage: true });

  await page.getByRole("textbox", { name: "Search leads by name" }).fill("sarah");
  await expect(page.locator(".lead-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Contacted", exact: true }).click();
  await expect(page.getByRole("heading", { name: "No leads found" })).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.locator(".lead-card")).toHaveCount(6);

  await page.getByRole("button", { name: "Add new lead", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.screenshot({ path: path.join(screenshots, "03-add-lead.png"), fullPage: true });
  await page.getByRole("textbox", { name: "Full name" }).fill("Jordan Ellis");
  await page.getByRole("textbox", { name: "Company" }).fill("Atlas Partners");
  await page.getByRole("textbox", { name: "Phone" }).fill("+1 555 0170");
  await page.getByRole("button", { name: "Save lead" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open Jordan Ellis" })).toContainText("New");

  await page.getByRole("button", { name: "Open Sarah Connor" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Sarah Connor" })).toBeVisible();
  await expect(dialog.locator(".timeline-entry")).toHaveCount(3);
  await expect(dialog.locator(".timeline-entry").first()).toContainText("Sent pricing tier PDF");
  await page.screenshot({ path: path.join(screenshots, "04-timeline.png"), fullPage: true });
  await dialog.getByLabel("Status", { exact: true }).selectOption("qualified");
  await expect(dialog.getByLabel("Status", { exact: true })).toHaveValue("qualified");
  await dialog.getByRole("textbox", { name: "Keep the conversation going" }).fill("Confirmed the demo agenda and next steps.");
  await dialog.getByLabel("Set follow-up").check();
  await dialog.getByLabel("Follow-up time").fill("23:59");
  await dialog.getByRole("button", { name: "Save note" }).click();
  await expect(dialog.locator(".timeline-entry").first()).toContainText("Confirmed the demo agenda and next steps.");
  await dialog.getByRole("button", { name: "Close dialog" }).click();
  await expect(page.getByRole("button", { name: "Open Sarah Connor" })).toContainText("Confirmed the demo agenda and next steps.");
  await expect(page.locator(".today-section")).toContainText("Sarah Connor");

  await page.reload();
  await expect(page.getByRole("button", { name: "Open Jordan Ellis" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open Sarah Connor" })).toContainText("Qualified");
  await page.getByRole("button", { name: "Open Sarah Connor" }).click();
  await expect(dialog.getByLabel("Status", { exact: true })).toHaveValue("qualified");
  await expect(dialog.locator(".timeline-entry").first()).toContainText("Confirmed the demo agenda");
  await dialog.getByRole("textbox", { name: "Keep the conversation going" }).fill("A note without a new reminder.");
  await dialog.getByRole("button", { name: "Save note" }).click();
  await expect(dialog.locator(".current-reminder")).toContainText("11:59 PM");
  await dialog.getByRole("button", { name: "Mark complete" }).click();
  await expect(dialog.locator(".current-reminder")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Close dialog" }).click();
  await expect(page.locator(".today-section")).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("button", { name: "Add new lead", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: path.join(screenshots, "05-mobile.png"), fullPage: true });
  await page.getByRole("button", { name: "Open Jordan Ellis" }).click();
  await expect(dialog.getByRole("textbox", { name: "Keep the conversation going" })).toBeVisible();
  await dialog.getByLabel("Set follow-up").check();
  await expect(dialog.getByRole("button", { name: "Save note" })).toBeVisible();
  await page.screenshot({ path: path.join(screenshots, "06-mobile-timeline.png"), fullPage: true });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(errors).toEqual([]);
});
