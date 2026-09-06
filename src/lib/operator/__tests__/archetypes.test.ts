import { matchArchetype, ARCHETYPES, GENERIC_ARCHETYPE } from "../archetypes";

describe("matchArchetype - Keyword Scoring and Archetype Matching", () => {
  describe("Exact and Deterministic Match per Archetype", () => {
    it("should match 'pokemon-cards' when relevant keywords are present", () => {
      expect(matchArchetype("A binder full of pokemon cards and TCG items").id).toBe("pokemon-cards");
      expect(matchArchetype("pokémon trading card").id).toBe("pokemon-cards");
    });

    it("should match 'guitar-pedal' when relevant keywords are present", () => {
      expect(matchArchetype("Boss overdrive guitar pedal stompbox").id).toBe("guitar-pedal");
      expect(matchArchetype("Vintage synth and amp effects").id).toBe("guitar-pedal");
    });

    it("should match 'smartwatch' when relevant keywords are present", () => {
      expect(matchArchetype("Garmin Forerunner smartwatch").id).toBe("smartwatch");
      expect(matchArchetype("Apple watch fitness tracker").id).toBe("smartwatch");
    });

    it("should match 'furniture' when relevant keywords are present", () => {
      expect(matchArchetype("Wooden dining table and chair set").id).toBe("furniture");
      expect(matchArchetype("Living room sofa and wardrobe").id).toBe("furniture");
    });

    it("should match 'stroller' when relevant keywords are present", () => {
      expect(matchArchetype("Foldable baby stroller and pram").id).toBe("stroller");
      expect(matchArchetype("Child pushchair with rain cover").id).toBe("stroller");
    });
  });

  describe("Fallback to GENERIC_ARCHETYPE", () => {
    it("should return GENERIC_ARCHETYPE when clue has no matching keywords", () => {
      expect(matchArchetype("Random mysterious artifact")).toEqual(GENERIC_ARCHETYPE);
      expect(matchArchetype("Unspecified item xyz 123")).toEqual(GENERIC_ARCHETYPE);
      expect(matchArchetype("")).toEqual(GENERIC_ARCHETYPE);
    });
  });

  describe("Case Insensitivity and Accent Handling", () => {
    it("should match case-insensitively", () => {
      expect(matchArchetype("POKEMON CARDS").id).toBe("pokemon-cards");
      expect(matchArchetype("GUITAR PEDAL").id).toBe("guitar-pedal");
      expect(matchArchetype("GARMIN VIVOACTIVE").id).toBe("smartwatch");
    });

    it("should correctly handle accented keywords defined in ARCHETYPES", () => {
      expect(matchArchetype("pokémon").id).toBe("pokemon-cards");
      expect(matchArchetype("vívoactive").id).toBe("smartwatch");
      expect(matchArchetype("fēnix").id).toBe("smartwatch");
    });
  });

  describe("Keyword Scoring Calculation (Length Weighting)", () => {
    it("should select the archetype with highest total keyword length score", () => {
      // "trading card" (12) + "card" (4) + "cards" (5) = 21 for pokemon-cards
      // vs "watch" (5) = 5 for smartwatch
      const result = matchArchetype("Trading card binder with watch");
      expect(result.id).toBe("pokemon-cards");
    });

    it("should accumulate scores for multiple keyword hits in a single clue", () => {
      // "garmin" (6) + "vivoactive" (10) + "forerunner" (10) + "smartwatch" (10) = 36
      const smartwatchResult = matchArchetype("Garmin vivoactive forerunner smartwatch");
      expect(smartwatchResult.id).toBe("smartwatch");
    });
  });

  describe("Tie-breaking Behavior", () => {
    it("should prefer the first listed archetype when scores are strictly equal", () => {
      // "card" -> pokemon-cards score 4 (card)
      // "desk" -> furniture score 4 (desk)
      // pokemon-cards comes before furniture in ARCHETYPES array
      const clue = "card desk";
      const result = matchArchetype(clue);
      expect(result.id).toBe("pokemon-cards");
    });
  });

  describe("ARCHETYPES Data Integrity", () => {
    it("should have unique IDs for all archetypes", () => {
      const ids = ARCHETYPES.map((a) => a.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should have non-empty keywords and valid price ranges for all archetypes", () => {
      for (const a of ARCHETYPES) {
        expect(a.keywords.length).toBeGreaterThan(0);
        expect(a.marketLow).toBeLessThan(a.marketHigh);
        expect(a.channels.length).toBeGreaterThan(0);
        expect(a.questions.length).toBeGreaterThan(0);
      }
    });

    it("should have empty keywords for GENERIC_ARCHETYPE", () => {
      expect(GENERIC_ARCHETYPE.keywords).toEqual([]);
      expect(GENERIC_ARCHETYPE.marketLow).toBeLessThan(GENERIC_ARCHETYPE.marketHigh);
    });
  });
});
