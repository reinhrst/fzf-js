import {Fzf} from "./index.js"

let fzf: Fzf

function createElement(name: string, classList: string[], innerText?: string): HTMLElement {
  const el = document.createElement(name)
  el.classList.add(...classList)
  if (innerText !== undefined) {
    el.innerText = innerText
  }
  return el
}

async function run() {
  await Fzf.init()
  console.log("Fzf init complete");

  // put Fzf in the global scope so that it can be played with from the console
  (globalThis as any).Fzf = Fzf;
  (globalThis as any).myFruitUrl = "https://gist.githubusercontent.com/reinhrst/1fcb49f0886621857f05c8e4969fc3b0/raw/da7b5a4d838ca8eddbc40377c7969d64aae6a1ce/data.json";

  console.log("Fzf is now in global scope.")
  console.log("If you want to play with it:")
  console.log(`  let myFzf
  // load sentences about fruit (myFruitUrl has been set for your pleasure :))
  fetch(myFruitUrl)
    .then(r => r.json())
    .then(data => {
      console.log("loaded")
      myFzf = new Fzf(data);
      console.log("myFzf ready");
    })
    // **** now wait until you see 'myFzf ready' (may take a while) ******
    myFzf.addResultListener((result) => {
      console.log("Searching for '" + result.needle + "' resulted in " + result.matches.length + " hits.")
    })
    myFzf.search("hello world")
  `)


  const quoteText = await (await fetch("https://gist.githubusercontent.com/JakubPetriska/060958fd744ca34f099e947cd080b540/raw/963b5a9355f04741239407320ac973a6096cd7b6/quotes.csv")).text()
  // poor mans csv parser
  const quotes: [string, string][] = quoteText.split("\n")
    .slice(1)  // header
    .map(l => l.trim())
    .map((l) => l.match(/^"([^"]*)", *"([^"]*)"$/)?.slice(1) as [string, string])
    .filter(match => match != null)

  var searchStart: number

  fzf = new Fzf(quotes.map(([_person, quote]) => quote));
  fzf.addResultListener((result: SearchResult): void => {
    const elapsed = Date.now() - searchStart
    const matches = result.matches.slice(0, 100) // max show 100 matches
    const infoDiv = document.createElement("div")
    infoDiv.classList.add("info")
    infoDiv.innerText = `Found ${result.matches.length} results for "${result.needle}" in ${elapsed} milliseconds`
    const elements = [
      infoDiv,
      ...matches.map(matchResult => {
      const el = createElement("div", ["matchresult"])
      const positions: [number, number][] = matchResult.positions
        .sort((a, b) => a - b)
        .reduce((acc, cur): [number, number][] => {
          if (acc.length == 0 || cur > acc[acc.length - 1][1]) {
            return [...acc, [cur, cur + 1]]
          }
            return [...acc.slice(0, -1), [acc[acc.length - 1][0], cur + 1]]
          }, [] as [number, number][])
      let spans = positions.reduce((acc, cur, i): HTMLSpanElement[] => {
        const lastpos = i == 0 ? 0 : positions[i - 1][1]
        const currentpos = cur[0]
        if (lastpos < currentpos) {
          acc.push(createElement(
            "span", ["normal"], matchResult.key.slice(lastpos, currentpos)))
        }
          acc.push(createElement(
            "span", ["searchhighlight"], matchResult.key.slice(...cur)))
        return acc
      }, [] as HTMLSpanElement[])
      const lastpos = positions.length == 0 ? 0 : positions[positions.length - 1][1]
      if (lastpos != matchResult.key.length) {
        spans.push(createElement(
          "span", ["normal"], matchResult.key.slice(lastpos)))
      }
      const author = quotes[matchResult.hayIndex][0]
      spans.push(createElement(
        "span", ["author", ...(author ? [] : ["unknown"])],
        author ? author : "<unknown>"))
      el.append(...spans)
      return el
    })]
    const output = document.getElementById("output")!
    output.innerHTML = ''
    output.append(...elements)
  });

  function startSearch() {
      searchStart = Date.now()
      fzf.search((document.getElementById("search") as HTMLInputElement).value)

  }

  (document.getElementById("search") as HTMLInputElement).addEventListener(
    "input", startSearch)
  startSearch();
  (document.getElementById("search") as HTMLInputElement).focus();
}


run()


