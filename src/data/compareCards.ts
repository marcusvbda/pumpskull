// Final screen: five cards "Day of the Dead vs Halloween" (spec section 7, screen 13).
// Draft text, to be reviewed by Vinicius before the class.

export interface CompareCard {
  title: string;
  icon: string;
  dod: string;
  halloween: string;
}

export const COMPARE_CARDS: CompareCard[] = [
  {
    title: "The mood",
    icon: "🎭",
    dod: "A joyful celebration that remembers loved ones with music, food and stories.",
    halloween: "A spooky, playful night of costumes, candy and scary decorations.",
  },
  {
    title: "The symbols",
    icon: "💀",
    dod: "Marigolds, sugar skulls, La Catrina and papel picado.",
    halloween: "Pumpkins, ghosts, bats, witches and spiders.",
  },
  {
    title: "The food",
    icon: "🍞",
    dod: "Pan de muerto, tamales and the favourite dishes of the person remembered.",
    halloween: "Candy, caramel apples and pumpkin treats.",
  },
  {
    title: "The roots",
    icon: "🌍",
    dod: "Mexico: Aztec traditions mixed with Spanish Catholic ones.",
    halloween: "Ireland and Britain: the Celtic festival Samhain mixed with All Saints' Day.",
  },
  {
    title: "The dates and the fun",
    icon: "📅",
    dod: "November 1 and 2: build an ofrenda and visit the cemetery.",
    halloween: "October 31: wear costumes, trick-or-treat and carve pumpkins.",
  },
];
