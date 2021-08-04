# fzf-js

Fzf-js is (for now) a demo of how a go library ([fzf-lib](https://github.com/reinhrst/fzf-lib)) can be used in a browser (or nodejs) context.

An accompanying blog post will appear soon on https://blog.claude.nl/

## Install / use
For now this is not something to be used by end users.

In order to see how things work, you need to install `go`, `tinygo` and `gopherjs`.

Afterwards, run `npm run build-go`, `npm run build-tinygo` and `npm run build-gopherjs` to get the three versions of these files.
Note that tinygo at the moment compiles with `-opt=2`, since there is a [bug](https://github.com/tinygo-org/tinygo/issues/1790) in the default `-opt=z`.

Run a simple webserver in the (created) lib directory (e.g. `python3 -m http.server`) and visit the pages on
- http://localhost:8000/go/example.html
- http://localhost:8000/tinygo/example.html
- http://localhost:8000/gopherjs/example.html


In the console you can play around with Fzf if you want.
