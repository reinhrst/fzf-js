import {Fzf} from "./index.js"

let fzf: Fzf

async function run() {
  const quoteText = await (await fetch("https://gist.githubusercontent.com/JakubPetriska/060958fd744ca34f099e947cd080b540/raw/963b5a9355f04741239407320ac973a6096cd7b6/quotes.csv")).text()
  // poor mans csv parser
  const quotes: [string, string][] = quoteText.split("\n")
    .slice(1)  // header
    .map(l => l.trim())
    .map((l) => l.match(/^"([^"]*)", *"([^"]*)"$/)?.slice(1) as [string, string])
    .filter(match => match != null)

  var searchStart: number

  await Fzf.init()
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
      const el = document.createElement("div")
      el.classList.add("matchresult")
      const positions: [number, number][] = matchResult.positions
        .sort()
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
          const span = document.createElement("span")
          span.classList.add("normal")
          span.innerText = matchResult.key.slice(lastpos, currentpos)
          acc.push(span)
        }
        const span = document.createElement("span")
        span.classList.add("searchhighlight")
        span.innerText = matchResult.key.slice(cur[0], cur[1])
        acc.push(span)
        return acc
      }, [] as HTMLSpanElement[])
      const lastpos = positions.length == 0 ? 0 : positions[positions.length - 1][1]
      if (lastpos != matchResult.key.length) {
        const span = document.createElement("span")
        span.classList.add("normal")
        span.innerText = matchResult.key.slice(lastpos)
        spans.push(span)
      }
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


