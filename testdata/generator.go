package main

import (
    "os"
    "fmt"
    "flag"
    "math/rand"
    "strings"
)

var fruits = []string{`Abiu`, `Açaí`, `Acerola`, `Ackee`, `African cucumber`, `Apple`, `Apricot`, `Avocado`, `Banana`, `Bilberry`, `Blackberry`, `Blackcurrant`, `Black sapote`, `Blueberry`, `Boysenberry`, `Breadfruit`, `Buddha's hand (fingered citron)`, `Cactus pear`, `Canistel`, `Cempedak`, `Cherimoya (Custard Apple)`, `Cherry`, `Chico fruit`, `Cloudberry`, `Coco De Mer`, `Coconut`, `Crab apple`, `Cranberry`, `Currant`, `Damson`, `Date`, `Dragonfruit (or Pitaya)`, `Durian`, `Egg Fruit`, `Elderberry`, `Feijoa`, `Fig`, `Finger Lime (or Caviar Lime)`, `Goji berry`, `Gooseberry`, `Grape`, `Raisin`, `Grapefruit`, `Grewia asiatica (phalsa or falsa)`, `Guava`, `Hala Fruit`, `Honeyberry`, `Huckleberry`, `Jabuticaba`, `Jackfruit`, `Jambul`, `Japanese plum`, `Jostaberry`, `Jujube`, `Juniper berry`, `Kaffir Lime`, `Kiwano (horned melon)`, `Kiwifruit`, `Kumquat`, `Lemon`, `Lime`, `Loganberry`, `Longan`, `Loquat`, `Lulo`, `Lychee`, `Magellan Barberry`, `Mamey Apple`, `Mamey Sapote`, `Mango`, `Mangosteen`, `Marionberry`, `Melon`, `Cantaloupe`, `Galia melon`, `Honeydew`, `Mouse melon`, `Musk melon`, `Watermelon`, `Miracle fruit`, `Monstera deliciosa`, `Mulberry`, `Nance`, `Nectarine`, `Orange`, `Blood orange`, `Clementine`, `Mandarine`, `Tangerine`, `Papaya`, `Passionfruit`, `Peach`, `Pear`, `Persimmon`, `Plantain`, `Plum`, `Prune (dried plum)`, `Pineapple`, `Pineberry`, `Plumcot (or Pluot)`, `Pomegranate`, `Pomelo`, `Purple mangosteen`, `Quince`, `Raspberry`, `Salmonberry`, `Rambutan (or Mamin Chino)`, `Redcurrant`, `Rose apple`, `Salal berry`, `Salak`, `Satsuma`, `Shine Muscat or Vitis Vinifera`, `Sloe or Hawthorn Berry`, `Soursop`, `Star apple`, `Star fruit`, `Strawberry`, `Surinam cherry`, `Tamarillo`, `Tamarind`, `Tangelo`, `Tayberry`, `Tomato`, `Ugli fruit`, `White currant`, `White sapote`, `Yuzu`}

func main() {
    randomizer := rand.New(rand.NewSource(12345))
    var nrlines int
    flag.IntVar(&nrlines, "n", 1 << 20, "Number of lines to produce")
    flag.Parse()
    fmt.Fprintf(os.Stderr, "Now creating %d lines of fruit\n", nrlines)

    for i := 0; i < nrlines; i++ {
        nrwords := 3 + randomizer.Intn(10)
        var words []string
        for j := 0; j < nrwords; j++ {
            words = append(words, fruits[randomizer.Intn(len(fruits))])
        }
        fmt.Fprintln(os.Stdout, strings.Join(words, " "))
    }
}

