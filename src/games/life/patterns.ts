export type Pattern = Array<[number, number]>

export function patternFromAscii(art: string): Pattern {
  const rows = art.split('\n').filter((row) => row.length > 0)
  const cells: Pattern = []
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === 'O') cells.push([x, y])
    }
  })
  return cells
}

export const GLIDER = patternFromAscii(`
.O.
..O
OOO
`)

export const PULSAR = patternFromAscii(`
..OOO...OOO..
.............
O....O.O....O
O....O.O....O
O....O.O....O
..OOO...OOO..
.............
..OOO...OOO..
O....O.O....O
O....O.O....O
O....O.O....O
.............
..OOO...OOO..
`)
