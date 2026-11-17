import { describe, it, expect } from "vitest";
import { solarToLunar, lunarAt, holyDayAt, lunarLabel } from "@/lib/lunar";

/** Noon in Vietnam on a Gregorian date. */
const vn = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d, 5, 0, 0);

describe("lunar calendar: known dates", () => {
  it("Tết Giáp Thìn was 10 Feb 2024", () => {
    expect(solarToLunar(10, 2, 2024)).toMatchObject({ day: 1, month: 1, year: 2024 });
  });

  it("Tết Ất Tỵ was 29 Jan 2025", () => {
    expect(solarToLunar(29, 1, 2025)).toMatchObject({ day: 1, month: 1, year: 2025 });
  });

  it("Tết Bính Ngọ is 17 Feb 2026", () => {
    expect(solarToLunar(17, 2, 2026)).toMatchObject({ day: 1, month: 1, year: 2026 });
  });

  it("the day before Tết is still the old lunar year (30 or 29 tháng Chạp)", () => {
    const eve = solarToLunar(16, 2, 2026);
    expect(eve.month).toBe(12);
    expect(eve.year).toBe(2025);
    expect(eve.day).toBeGreaterThanOrEqual(29);
  });

  it("Trung thu 2024 (rằm tháng 8) was 17 Sep 2024", () => {
    expect(solarToLunar(17, 9, 2024)).toMatchObject({ day: 15, month: 8, year: 2024 });
  });

  it("2025 has a leap 6th month (tháng 6 nhuận)", () => {
    // 25 Jul 2025 is the first day of the leap month 6 of Ất Tỵ.
    expect(solarToLunar(25, 7, 2025)).toMatchObject({ day: 1, month: 6, leap: true });
  });
});

describe("lunar calendar: holy days in Vietnam time", () => {
  it("knows rằm and mùng một", () => {
    expect(holyDayAt(vn(2024, 9, 17))).toBe("ram");
    expect(holyDayAt(vn(2026, 2, 17))).toBe("mung1");
    expect(holyDayAt(vn(2026, 2, 18))).toBeNull();
  });

  it("uses the Vietnam date, not UTC (Tết starts at Vietnam midnight)", () => {
    expect(lunarAt(Date.UTC(2026, 1, 16, 17, 30)).day).toBe(1); // 00:30 on 17 Feb in Vietnam
    expect(lunarAt(Date.UTC(2026, 1, 16, 16, 30)).day).not.toBe(1); // 23:30 on 16 Feb
  });

  it("labels days for the header", () => {
    expect(lunarLabel(vn(2024, 9, 17))).toBe("Rằm tháng 8");
    expect(lunarLabel(vn(2026, 2, 17))).toBe("Mùng một tháng Giêng");
  });
});
