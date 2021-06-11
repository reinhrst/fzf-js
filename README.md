# fzf-js

FZF-js is a pure typescript / javascript implementation of a fuzzyfind matcher.
It 100% supports the search syntax of the (absolutely great) [junegunn/fzf][1] package (meaning that for any given input list and search string, the matched values should be exactly the same, discrepancies should be reported as bugs).
It does try to improve on some of the aspects of the fzf package (see below).
On the other hand, where fzf is a full fetched commandline program (including an interface to select the best match (as well as a vim plugin), fzf-js (for now) only includes the matcher; i.e. the piece that, based on a list of input strings and a search string, ranks the input strings from best to worst match (and no match)).

It should be noted that this package has no relation to the fzf package by @junegunn, except that that package formed the inspiration for this one.

Given a list of strings (HayStraws) and a search string (needle), this package will return the matching HayStraws, each with a score (of how good a match it is) and a list of which letters make up the match (so that an app could highlight those if desired).


## Install / use
... TBC

## Pure typescript / javascript
The package is written in typescript and distributed as pure javascript (with optional type information).
It is not dependent on any backend, and and such can be used in both server side node (online or offline) and in clientside javascript (webpages; both online and offline as well).
It has no dependencies runtime on other npm packages, in order to not explode the npm tree and (just to make it clear) does not depend on having the fzf cli application installed.

## Performance
This package is meant to be used to quickly and easily search realtime through large amounts of data.
Performance has therefore been a consideration from the start.


Some things to consider with performance....
... (more to follow)

## Matching and scoring
The libary matches and scores a list of strings (HayStack, being a list of HayStraws) based on a search string (Needle).
*(Note that actually a HayStraw is a string (for matching) and an optional payload, so for instance the string to match is a book title, while the payload is the book object; in this document we constantly only talk about the string-part of the HayStraw because it's just easier to imagine. Just remember that every HayStraw also has a payload).*
The result is a list of strings (actually each string may contain an optional payload, for instance the string may be a book title, where the payload contains all the details) that match a certain search string, with a score for each match.

The matching and scoring system is created in such a way that typing should be intuitive in finding the right results.
The modifiers named in the Matching section below are mostly for advanced use, on in case one might want to explicitly include/exclude a large subset of items (e.g., using `![DEBUG]` when searching through log lines will exclude all lines containing the substring `[DEBUG]`

It should be noted that each word in the Needle (search string) is independent.
A HayStraw (string that is matched) only matches if all words in the needle match (each according to its own rules).
The score is a combination of the scores of each word.
Words are delimited by spaces, unless the space is escaped by a backslash (`\`), in which case the literal space is matched.
For instance, the needle `apple pear grape` has 3 search words, and will match any HayStraw that matches `apple` and matches `pear` and matches `grape` (technically the have to *fuzzy*-match these words, but let's ignore this for now).
On the other hand, the needle `apple\ pear\ grape` is a single word, and the match is made for the whole string `apple pear grape`.
*(I'm sure programmers will ask themselves now "great, so how do I match a backslash? Do I have to escape that too?" The answer is "no". `app\le` will match that exact string and `app\\le` will match strings with 2 backslashes in it -- so the first backslash does not escape the second one. If want to match a word ending in a backslash, there is no good way to do that atm. This is not my choice, the syntax was taken from fzf (although I do think that this is more intuitive than demanding people to escape backslashes all through their search needles).*

### Matching
A HayStraw is only returned in the output, if it matches all the words in the Needle (see above for what exactly a word is).
Each word can have 1 or more modifiers.

|search word|meaning|
|-------------|-------|
|`apple`|Fuzzy search for `apple` (see below what fuzzy search means).|
|`'apple`|Word starting with `'` means an exact search for this word.|
|`!apple`|Word starting with `!` means *exclude* all words with this exact match.|
|`^apple`|Word starting with `^` means that HayStraw should start with this exact string.|
|`apple$`|Word ending in `$` means that HayStraw should end with this exact string.|
|`!^apple`|Word starting with `!^` means that HayStraw should *not* start with this exact string.|
|`!apple$`|Word starting in `!` and ending in `$` means that HayStraw should *not* end with this exact string.|
|`^apple$`|Word starting in `^` and ending in `$` means that HayStraw should be exactly `apple`|
|`!^apple$`|Word starting in `!^` and ending in `$` means that HayStraw should anything but exactly `apple`|

Some things to note and corner cases from this rule list

* All modifiers should come at the start (or end for `$`) of a word. In any other location they are a literal token (so `app^le` will fuzzy-search for `app^le`; `^` does not have a special meaning here.
* `'` marks an exact match and `!` an exact negative match. Note that there is no `!'`, and also no way to fuzzy-negatively-match. There are also no fuzzy matches for start and end of string (which makes sense).
* The words `'`, `!`, `^` and `!^` by themselves match everything (for now). This is done so that if searching during typing the list doesn't refresh like crazy.
* The word `$` matches all strings with a `$` in it, whereas the word `!$` matches all strings without a `$` in it. `^$` matches all HayStraws starting with a `$` whereas `!^$` matches all HayStraws not starting with a `$`. In all other cases when a word ends in `$`, it matches the end of the HayStraw.


#### Fuzzy search
Fuzzy search means that one expects the letters in the order provided, however they do not have to be sequential. For example, if the HayStraw is `apple`, a fuzzy search for `al` will match (since the first and fourth letter match), however a search for `la` will not match (since a fuzzy search will not go back from the fourth letter to the first). Obviously if the Needle is `l a` (with a space) these are 2 search words, both of which match, so there is a full match.

Note that especially with fuzzy searches, not all matches are "equal".
for instance, if the HayStraws are `apple`, `pear` and `grape` , then a fuzzy search for `pe` will match all three.
A *score* is attached to each match (see below) so that `pear` will come up on top, since this is most likely what the searcher was looking for.

#### Case matching
The matching is done semi-case-sensitive.
This means that a lowercase letter in a Needle word will match both a lowercase and uppercase letter in the HayStraw.
An uppercase letter in the Needle will only match an uppercase letter in the HayStraw.
The rationale behind this is that uppercase letters are typed intentionally, when one knows that this is what they are looking for, whereas a lowercase letter may be used lazilly or when one is not sure of the case of the letter one is looking for.

Note that the system uses the javascript `String.prototype.toLocaleLowerCase()` method to convert from upper to lowercase -- whatever that method supports, is supported :).
#### HayStraw limitations
As mentioned before, a HayStraw has a search string (called `key`) and a payload.
For now we demand that the searchstring adheres to the following rules:

* It may not be empty (length >= 1)
* It should contain only printable characters and newlines are not allowed.
* Unicode (non ascii) searchstrings are supported on those javascript systems that support unicode.
* Unicode characters (for now) are only exactly matched -- if your HayStraw key contains a long-dash or a double-opening-quote, etc, these are not matched by normal dashes or double quotes on your Needle. The only exception (for now) is the Case Matching rule above. 


#### Examples
For these exaples, assume the HayStraws `aPPle`, `peaR` and `gRapE`.

Note that in this example we only show what is *matched*, we don't order by score.

|Needle|Result|Rationale|
|----|---|-----|
|`ap`|`aPPle`, `gRapE`|Fuzzy match on `ap`
|`'ap`|`aPPle`, `gRapE`|Exact match on `ap`
|`^ap`|`aPPle`|Start of string match on `ap`
|`!ap`|`peaR`|Everything except exact match on `ap`
|`!^ap`|`peaR`, `gRapE`|Everything not starting with `ap`
|`app`|`aPPle`|only apple has 2 `p`s
|`aP`|`aPPle`|capital `P` in needle only matches capital `P` in HayStraws
|`rE`|`gRapE`|capital `E` in needle only matches capital `E` in HayStraws, whereas lowercase `r` matches both upper and lowercase.
|`aPE`||No matches with capital `P` and `E`.
|`!aP`|`peaR`, `gRapE`|Negative match with capitals.
|`R`|`peaR`, `gRapE`|
|`R$`|`peaR`|


### Scoring
The goal of the fuzzy finder is that a user can quickly find what they are looking for.
Usually a user will have an idea in their mind what they are looking for within a list of a certain type (a file, a stock symbol, a logline, etc) and ideally with a couple of letters typed into the fuzzy finder box, the result appears.
Note that the idea of this fuzzy-finder (just as the original fzf) is that a user will type increasingly more symbols, until they see what they're looking for in the top *X* hits and select it (with cursor or mouse etc) --  or alternatively selects/uses the whole remaining list.

Ideally a fuzzy find system contains some (configurable) way of scoring.
If for instance we have the HayStraws `apple (healthy, green)`, `pear (tasty)` and `grape (aromatic)`, then a user typing `pear` (a fuzzy search) will most likely be looking for the `pear (tasty)`, even though all match.
Probably the second best match is the `grape (aromatic)` (since the `pe` and `ar` are substrings, close together), whereas in `apple (healthy, green)` the matching letters are all over the place.
We achieve this by giving a higher score to the `pear` and `grape` matches in this case.
Note that any scoring algorithm is subjective, and may work better or worse for some people, or better or worse for some HayStraws -- the goal is to find something that works reasonably well for most cases.

This section I describe the rules defining the score.
It should be noted that there is no guarantee that these rules stay constant over versions; new insights may lead to new (hopefully better) rules.
Note that a single match can have multiple scores (since a match can be obtained in multiple ways). For instance the Needle `apple` could match the the HayStraw `a green apple` in 2 ways: "**a** green a**pple**" and "a green **apple**".
Obviously the second match will get the higher score.
If there are multiple matches, the one with the highest score is used.

It's important to understand that scores are relative and two scores can only be compared if they are for the same Needle.
Two scores for different Needles should not be compared.


#### Algorithm
The scoring is calculated by search word, and the total score is the factor of the score per word.

Each word will result in a score `0 < score <= 1`.
A score `<= 0` means "no match".
These are not returned at the moment.
A score of 1 means a "perfect" match.

The score is influenced in the following ways:
1. Negative matches (`!...`, `!^...`, `!....$` and `!^...$`) always return a score of 1 when there is no match.
2. Exact matches (`'...`) get a base score of 0.125. This can be multiplied by 4 if the match is made at the start of the string, or by 2 if it matches the start of a word. In addition, it can be multiplied by 2 again if it matches a full word.
3. Start or end matches (`^...`, `...$`, `^....$`) use exactly the same rules as `'...`, where it should be noted that `^...` always received the times 4 multiplier for being at the start of the string.
4. Fuzzy match get a base score of 0.125, divided by 9 for each "break" in the match. So for instance the search word `gr` will score 0.125 for "the super**gr**eat rabbit", and 0.125 / 9 for "a bi**g** boa**r**". In addition to this, the start-matching and word-matching rules of rules 2 apply.
5. Rules 2, 3 and 4 are also subject to case-penalty. For each uppercase HayStraw letter that is matched by a lowercase Needle letter, score is divided by 2.

In order to make the rules readable, I put numbers in there.
I do think that these numbers will need some tweaking -- and probably we want to make them configurable.
There should be constants for (with currently chosen values and limitations):
* `START_OF_STRING_BONUS`: 2
* `START_OF_WORD_BONUS`: 2 (`< START_OF_STRING_BONUS`)
* `WHOLE_WORD_BONUS`: 2 (`< START_OF_STRING_BONUS`)
* `FUZZY_MATCH_BREAK_PENALTY`: 9 (`> START_OF_STRING_BONUS * START_OF_WORD_BONUS * WHOLE_WORD_BONUS`)
* `CASE_PENALTY`: 2

??? Question: do we need a "match to end of string bonus?". Looking for `'apple` should give the HayStraw `an apple` a higher score than `an applepie` ???

This results in a base score of `BASE_SCORE = 1 / (START_OF_STRING_BONUS * START_OF_WORD_BONUS * WHOLE_WORD_BONUS)`, so that maximum score is 1 (note that multiple bonusses can be earned; a `START_OF_STRING_BONUS` implies also a `START_OF_WORD_BONUS` and a `WHOLE_WORD_BONUS` also imples as `START_OF_WORD_BONUS`)

`FUZZY_MATCH_BREAK_PENALTY` needs to be larger than `START_OF_STRING_BONUS * START_OF_WORD_BONUS * WHOLE_WORD_BONUS`; else matching `apple` to `a beautiful apple` would result in "**a** beautiful a**pple**" having the highest score (likewise, looking for `asynchronous` would give "**a** good **synchronous** function" a higher score than "my **asynchronous** function").

The only thing remaning now is to determine word boundaries so that we can assign `START_OF_WORD_BONUS` and `WHOLE_WORD_BONUS`.
For now we use the following definition:
* any place that is matched by the regex `\b` -- including start and end of string
* Before an uppercase letter (anything that is not the same after `String.prototype.toLocaleLowerCase()`) that follows a lowercase letter (so in `myCamelCaseWord` there are 4 words defined).
* Before an uppercase letter that is followed by a lowercase letter (so something like `MySAMLServer` is correctly parsed to `My` `SAML` `Server`.


#### Examples

|Needle|HayStraw|Score|Rationale|
|------|--------|-----|---------|
|`^ap`|`apple and pear`|0.5|`BASE_SCORE * START_OF_STRING_BONUS * START_OF_STRING_BONUS`
|`'ap`|`apple and pear`|0.5|`BASE_SCORE * START_OF_STRING_BONUS * START_OF_STRING_BONUS`
|`'apple`|`apple and pear`|1|`BASE_SCORE * START_OF_STRING_BONUS * START_OF_STRING_BONUS * WHOLE_WORD_BONUS`
|`^apple`|`apple and pear`|1|`BASE_SCORE * START_OF_STRING_BONUS * START_OF_STRING_BONUS * WHOLE_WORD_BONUS`
|`^apple`|`apple`|1|`BASE_SCORE * START_OF_STRING_BONUS * START_OF_STRING_BONUS * WHOLE_WORD_BONUS`
|`^apple`|`aPPle`|.25|`BASE_SCORE * START_OF_STRING_BONUS * START_OF_STRING_BONUS * WHOLE_WORD_BONUS / (CASE_PENALTY * CASE_PENALTY)`
|`^apPle`|`aPPle`|.5|`BASE_SCORE * START_OF_STRING_BONUS * START_OF_STRING_BONUS * WHOLE_WORD_BONUS / (CASE_PENALTY)`
|`abd`|`a beautiful day`|.05|`BASE_SCORE * (START_OF_STRING_BONUS * START_OF_STRING_BONUS * WHOLE_WORD_BONUS) * (START_OF_WORD_BONUS) * (START_OF_WORD_BONUS) / (FUZZY_MATCH_BREAK_PENALTY * FUZZY_MATCH_BREAK_PENALTY)`



Note: see that the score for `abd` for `a beautiful day` is rather low. Fuzzy matches tend to get low scores pretty soon, some tweaking may be needed here (is `a lambda function` really a better match?)

### Matching letters

For every positive match, a list of matching intervals is created.
So for instance, if your needle is `abd 'beaut ^a`, for the HayStraw `a beautiful day` the intervallist `[[0,1], [2,7], [12,13]]` is created (these are the letters that were used to match all search words).
It's often beneficial to use these intervals to colour the result list, so that a user can see (while typing) how the search is developing.



[1]: https://github.com/junegunn/fzf
