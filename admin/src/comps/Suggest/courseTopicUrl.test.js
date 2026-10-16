import {findTopicPosition, topicParamFor, CHECK_TOPIC} from "./courseTopicUrl";

const modules = [{module: "m1", questions: ["a", "b"]}, {module: "m2", questions: ["c", "d"]}];

describe("courseTopicUrl", () => {
    test("находит модуль и топик по id вопроса", () => {
        expect(findTopicPosition(modules, "d")).toEqual({moduleInd: 1, blockInd: 1});
        expect(findTopicPosition(modules, "b")).toEqual({moduleInd: 0, blockInd: 1});
    });
    test("недоступный модуль и неизвестный id игнорируются", () => {
        expect(findTopicPosition(modules, "d", 0)).toBeNull();
        expect(findTopicPosition(modules, "zzz")).toBeNull();
        expect(findTopicPosition(modules, null)).toBeNull();
    });
    test("параметр для топика и для проверки модуля", () => {
        expect(topicParamFor(modules[1], 0)).toBe("c");
        expect(topicParamFor(modules[1], -1)).toBe(CHECK_TOPIC);
        expect(topicParamFor(undefined, 0)).toBeNull();
    });
});

describe("courseTopicUrl: переход в редактор и обратно", () => {
    const {buildRunUrl, safeBackPath} = require("./courseTopicUrl");
    test("ссылка на редактор несёт адрес возврата", () => {
        expect(buildRunUrl("2146", "/courses/1367?topic=2146"))
            .toBe("/run?question=2146&back=%2Fcourses%2F1367%3Ftopic%3D2146");
        expect(buildRunUrl("2146")).toBe("/run?question=2146");
    });
    test("возврат только на внутренний путь", () => {
        expect(safeBackPath("/courses/1367?topic=2146")).toBe("/courses/1367?topic=2146");
        expect(safeBackPath("//evil.com")).toBeNull();
        expect(safeBackPath("https://evil.com")).toBeNull();
        expect(safeBackPath(null)).toBeNull();
    });
});
