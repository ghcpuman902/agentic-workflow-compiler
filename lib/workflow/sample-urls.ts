export const SAMPLE_CANNES_URLS = `https://www.festival-cannes.com/en/f/amarga-navidad/
https://www.festival-cannes.com/en/f/coward/
https://www.festival-cannes.com/en/f/das-getraumte-abenteuer/
https://www.festival-cannes.com/en/f/el-ser-querido/
https://www.festival-cannes.com/en/f/fatherland/
https://www.festival-cannes.com/en/f/fjord/
https://www.festival-cannes.com/en/f/garance/
https://www.festival-cannes.com/en/f/gentle-monster/
https://www.festival-cannes.com/en/f/histoires-de-la-nuit/
https://www.festival-cannes.com/en/f/histoires-paralleles/
https://www.festival-cannes.com/en/f/hope/
https://www.festival-cannes.com/en/f/l-inconnue/
https://www.festival-cannes.com/en/f/la-bola-negra/
https://www.festival-cannes.com/en/f/la-vie-d-une-femme/
https://www.festival-cannes.com/en/f/minotaur/
https://www.festival-cannes.com/en/f/moulin/
https://www.festival-cannes.com/en/f/nagi-notes/
https://www.festival-cannes.com/en/f/notre-salut/
https://www.festival-cannes.com/en/f/paper-tiger/
https://www.festival-cannes.com/en/f/sheep-in-the-box/
https://www.festival-cannes.com/en/f/soudain/
https://www.festival-cannes.com/en/f/the-man-i-love/`

export function parseUrlLines(text: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of text.split("\n")) {
    const url = raw.trim()
    if (!url || seen.has(url)) continue
    seen.add(url)
    out.push(url)
  }
  return out
}
