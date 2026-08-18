import { describe, expect, it } from "vitest";

import type { Partner } from "./api";
import {
  getPartnerWebsite,
  getPhoneHref,
  parsePartnerPhones,
  toPartnerCard,
} from "./partners";

function partner(overrides: Partial<Partner> = {}): Partner {
  return {
    id: 1,
    name: 'ООО "ЭкоГрин"',
    logoUrl: "/partners2.webp",
    address: "г.Краснодар",
    phones: "+7 (861) 224-75-37\n+7 (989) 802 43 78",
    email: "info@ecogreen.ru",
    website: "https://ecogreen.ru",
    sortOrder: 0,
    ...overrides,
  };
}

describe("partner cards", () => {
  it("strips formatting from the tel: target but keeps the printed number", () => {
    expect(getPhoneHref("+7 (861) 224-75-37")).toBe("tel:+78612247537");
    expect(
      parsePartnerPhones("+7 (861) 224-75-37\n\n +7 (989) 802 43 78 "),
    ).toEqual([
      { href: "tel:+78612247537", label: "+7 (861) 224-75-37" },
      { href: "tel:+79898024378", label: "+7 (989) 802 43 78" },
    ]);
  });

  it("makes a scheme-less site address clickable without rewriting the label", () => {
    expect(getPartnerWebsite("ecogreen.ru")).toEqual({
      href: "https://ecogreen.ru",
      label: "ecogreen.ru",
    });
    expect(getPartnerWebsite("http://ecogreen.ru")?.href).toBe(
      "http://ecogreen.ru",
    );
  });

  // Blank fields are what the card drops entirely, so they have to arrive as
  // `null`/empty rather than as an empty string that still renders a row.
  it("reports every empty contact detail as missing", () => {
    expect(
      toPartnerCard(
        partner({
          logoUrl: "",
          address: "  ",
          phones: "",
          email: "",
          website: "",
        }),
      ),
    ).toEqual({
      id: 1,
      name: 'ООО "ЭкоГрин"',
      logoUrl: null,
      address: null,
      phones: [],
      email: null,
      website: null,
    });
  });

  it("keeps every filled detail of the seeded partner", () => {
    const card = toPartnerCard(partner());

    expect(card.logoUrl).toBe("/partners2.webp");
    expect(card.address).toBe("г.Краснодар");
    expect(card.phones).toHaveLength(2);
    expect(card.email).toBe("info@ecogreen.ru");
    expect(card.website).toEqual({
      href: "https://ecogreen.ru",
      label: "https://ecogreen.ru",
    });
  });
});
