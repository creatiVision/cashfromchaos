import { matchArchetype, ARCHETYPES, GENERIC_ARCHETYPE } from "../archetypes";

describe("matchArchetype", () => {
  it("returns GENERIC_ARCHETYPE when clue has no matching keywords", () => {
    const result = matchArchetype("unrelated random text 12345");
    expect(result.id).toBe(GENERIC_ARCHETYPE.id);
  });

  it("matches a single keyword correctly", () => {
    const result = matchArchetype("looking for a stroller");
    expect(result.id).toBe("stroller");
  });

  it("calculates score based on keyword lengths and picks highest scoring archetype", () => {
    // "garmin forerunner 245" matches "garmin" (6), "forerunner" (10) for smartwatch archetype
    const result = matchArchetype("Garmin Forerunner 245 running watch");
    expect(result.id).toBe("smartwatch");
  });

  it("resolves ties by picking the first matching archetype with highest score", () => {
    const result = matchArchetype("GARMIN VIVOACTIVE");
    expect(result.id).toBe("smartwatch");
  });

  it("correctly matches all archetypes by their primary keywords", () => {
    for (const archetype of ARCHETYPES) {
      if (archetype.keywords.length > 0) {
        const clue = archetype.keywords.join(" ");
        const matched = matchArchetype(clue);
        expect(matched.id).toBe(archetype.id);
      }
    }
  });
});
