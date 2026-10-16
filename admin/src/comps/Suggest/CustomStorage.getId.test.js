import CustomStorage from "./CustomStorage";

describe("CustomStorage.getId", () => {
    test("id курса берётся из пути, без ?topic", () => {
        window.history.pushState({}, "", "/courses/1338?topic=2110");
        expect(CustomStorage.getId()).toBe("1338");
        window.history.pushState({}, "", "/courses/1338");
        expect(CustomStorage.getId()).toBe("1338");
    });
});
