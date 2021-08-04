package main

import (
    "syscall/js"
    "github.com/reinhrst/fzf-lib"
)


var fzfs []*fzf.Fzf

func ExposeConstants(this js.Value, args []js.Value) interface{} {
    if !this.IsUndefined() {
        panic(`Expect "this" to be undefined`)
    }
    if len(args) != 0 {
        panic(`Expect no arguments`)
    }
    return map[string]interface{}{
        "ByScore": int(fzf.ByScore),
        "ByLength": int(fzf.ByLength),
        "ByBegin": int(fzf.ByBegin),
        "ByEnd": int(fzf.ByEnd),
        "CaseSmart": int(fzf.CaseSmart),
        "CaseIgnore": int(fzf.CaseIgnore),
        "CaseRespect": int(fzf.CaseRespect),
    }
}


func New(this js.Value, args []js.Value) interface{} {
    if !this.IsUndefined() {
        panic(`Expect "this" to be undefined`)
    }
    if len(args) != 3 {
        panic(`Expect three arguments: hayStack, options, callback`)
    }
    jsHayStack := args[0]
    jsOptions := args[1]
    jsCallback := args[2]

    length := args[0].Length()
    if (length < 1) {
        panic(`Call fzf with at least one word in the hayStack`)
    }
    var hayStack []string
    for i :=0; i < jsHayStack.Length(); i++ {
        hayStack = append(hayStack, jsHayStack.Index(i).String())
    }

    opts := fzf.DefaultOptions()
    if !jsOptions.Get("Extended").IsUndefined() {
        opts.Extended = jsOptions.Get("Extended").Bool()
    }
    if !jsOptions.Get("Fuzzy").IsUndefined() {
        opts.Fuzzy = jsOptions.Get("Fuzzy").Bool()
    }
    if !jsOptions.Get("CaseMode").IsUndefined() {
        opts.CaseMode = fzf.Case(jsOptions.Get("CaseMode").Int())
    }
    if !jsOptions.Get("Sort").IsUndefined() {
        sort := jsOptions.Get("Sort")
        opts.Sort = nil
        for i := 0; i < sort.Length(); i++ {
            opts.Sort = append(opts.Sort, fzf.Criterion(sort.Index(i).Int()))
        }
    }
    if !jsOptions.Get("Normalize").IsUndefined() {
        opts.Normalize = jsOptions.Get("Normalize").Bool()
    }

    myFzf := fzf.New(hayStack, opts)
    fzfs = append(fzfs, myFzf)

    go func() {
        for {
            result, more := <- myFzf.GetResultChannel()
            if !more {
                break;
            }
            jsCallback.Invoke(SearchResultToJs(result))
        }
    }()

    return js.ValueOf(len(fzfs) - 1)
}


func Search(this js.Value, args []js.Value) interface{} {
    if !this.IsUndefined() {
        panic(`Expect "this" to be undefined`)
    }
    if len(args) != 2 {
        panic(`Expect 2 arguments: fzfNr and needle`)
    }
    fzfNr := args[0].Int()
    needle := args[1].String()
    myFzf := fzfs[fzfNr]
    myFzf.Search(needle)
    return nil
}

func End(this js.Value, args []js.Value) interface{} {
    if !this.IsUndefined() {
        panic(`Expect "this" to be undefined`)
    }
    if len(args) != 1 {
        panic(`Expect 1 argument: fzfNr`)
    }
    fzfNr := args[0].Int()
    myFzf := fzfs[fzfNr]
    myFzf.End()
    fzfs[fzfNr] = nil
    return nil
}

func SearchResultToJs(result fzf.SearchResult) map[string]interface{} {
    var matchResults []interface{}
    for _, match := range result.Matches {
        var positions []interface{}
        for _, pos :=  range match.Positions {
            positions = append(positions, pos)
        }
        matchResults = append(matchResults, map[string]interface{} {
            "key": match.Key,
            "hayIndex": match.HayIndex,
            "score": match.Score,
            "positions": positions,
        })
    }
    var searchResult = map[string]interface{}{
        "needle": result.Needle,
        "matches": matchResults,
    }
    return searchResult
}

func main() {
    c := make(chan struct{}, 0)
    js.Global().Set("fzfNew", js.FuncOf(New))
    js.Global().Set("fzfSearch", js.FuncOf(Search))
    js.Global().Set("fzfEnd", js.FuncOf(End))
    js.Global().Set("fzfExposeConstants", js.FuncOf(ExposeConstants))
    <-c
}
