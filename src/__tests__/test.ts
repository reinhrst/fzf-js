import { Fzf } from '../index';
import {readFile} from "fs/promises"
import {spawnSync} from "child_process"

global.fetch = jest.fn(async (input: RequestInfo, _init?: RequestInit | undefined): Promise<Response> => {
  if (input == "main.wasm") {
    let filecontent: Buffer
    try{
      filecontent = await readFile("lib/main.wasm")
    } catch (e) {
      console.log("Error: ", e)
      throw e
    }
    var ab = new ArrayBuffer(filecontent.length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < filecontent.length; ++i) {
        view[i] = filecontent[i];
    }
    const response = {
      arrayBuffer: () => Promise.resolve(ab)
    }
    return response as Response
  } else {
    throw new Error("fetching not supported for " + input)
  }
})

const DATA: string[] = [
  "abcdef",
  "cdefab",
  "acbdeg",
  "bc-cdef",
  "hello^ad",
  "hello$",
  "hello hello",
  "hel'lo",
  "hel$lo",
  "hel^lo",
  "hel!lo",
]

let TESTS: [string, string, string[]][] = [
  ["Exact match", "'ab", ["abcdef", "cdefab"]],

  // expect reorder because cd at start or word should score higher
  ["Exact match start word bonus", "'cd", ["cdefab", "bc-cdef", "abcdef"]],

  // special chars in exact match don't have extra meaning (except $)
  ..."'!^".split("").map(
    c => [`Exact match with ${c}`, `'hel${c}`, [`hel${c}lo`]]),

  ["exact match ending in $ will ignore $", "'hel$",
    DATA.filter(s => s.indexOf("hel") != -1)],

  // whole bunch of search strings that mean nothing and should return all
  ...["", " ", "  ", "^", " ^", "^ ^", " ^ ", "!", "! ^", "'", "' ! ^   !"].map(
    needle => [`Should return everything`, needle, DATA]),
  // although....
  ["$ should just (fuzzy) search for $", "$", ["hello$", "hel$lo"]],


  ["Start of string match", "^ab", ["abcdef"]],
  ["Start of string match with ^", "^hel^", ["hel^lo"]],

  ["End of string match", "ab$", ["cdefab"]],
  ["End of string match with extra $", "$lo$", ["hel$lo"]],

  ["Start and end of string match", "^abcdef$", ["abcdef"]],
  ["Start and end of string match no result", "^hello$", []],
  ["Start and end of string match with ending $", "^hello$$", ["hello$"]],

  ["Space matching", "'hello hello", ["hello^ad", "hello$", "hello hello"]],
  ["Literal space matching", "'hello\\ hello", ["hello hello"]],

  // note that since "hel" is fully matched, this one gets a higher score
  ["Multiword matching", "^hel '$", ["hel$lo", "hello$"]],

  ["Fuzzy and exact mix", "adf 'cd bef", ["abcdef"]],
  ["Start of string match full word bonus", "^hel", [
    "hel'lo", "hel$lo", "hel^lo", "hel!lo", "hello^ad", "hello$", "hello hello"]],
] as [string, string, string[]][]

TESTS = TESTS.concat(
  TESTS.filter(t => t[1].length > 1 && t[1].indexOf(" ") == -1
               && !(t[1][0] == "'" && t[1].slice(-1) == "$")).map(
    ([name, needle, expected]) => [
      "Not " + name,
      "!" + (needle[0] == "'" ? needle.slice(1) : needle),
      DATA.filter(k => expected.indexOf(k) == -1),
    ])
);

TESTS = TESTS.concat([
  ["Fuzzy match", "ab", ["abcdef", "cdefab", "acbdeg"]],
  ["Fuzzy match consequtive preference", "ac", ["acbdeg", "abcdef"]],
]);

for (const [name, needle, expected] of TESTS) {
  test(name + ": " + JSON.stringify(needle), async () => {
    const fzf = spawnSync("fzf", ["--filter", needle], {
      input: DATA.join("\n"),
    })
    const expectedResult = fzf.stdout.toString().split("\n").filter(s => s.length)
    await Fzf.init()
    const finder = new Fzf(DATA)
    var searchPromise: Promise<SearchResult> = new Promise(resolve => {
      finder.addResultListener(result => resolve(result))
    })
    finder.search(needle)
    var result = await searchPromise
    expect(result.matches.map(match => match.key)).toStrictEqual(expectedResult)
  });
}

// test("Speed test", () => {
//   const finder = new Finder(Array(10240).fill(0).map(
//     (_) => Array(1024).fill(0).map(
//       (_) => String.fromCharCode(Math.floor(Math.random() * (128 - 32)) + 32)
//     ).join("")
//   ).map(k => ({key: k, item: {}})))
//   const now = Date.now()
//   finder.find("abc def ghi needle")
//   // should run in less than 1 second (does so on my macbook pro M1)
//   expect(Date.now() - now).toBeLessThan(1000)
// })
